import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';

import { SchemaFieldTypes } from 'redis';
import { Server, Socket } from 'socket.io';

import { RedisService } from '../redis/redis.service';
import { WsGuard } from '../auth/guards/ws.guard';
import { TimerService } from './timer.service';
import { ChessService, GameResult, MoveResult } from './chess.service';
import { OnEvent } from '@nestjs/event-emitter';
import { TimeoutEvent } from './interfaces/timeout-event.interface';
import { MatchService } from './match.service';
import { TokenParserService } from 'src/auth/token-parser.service';

export interface AuthorizedSocket extends Socket {
  user?: any;
}

// Gateway responsible for handling moves,
// game creation and such
@WebSocketGateway({
  cors: { origin: 'null' },
  withCredentials: true,
  cookie: { name: 'test', httpOnly: true },
})
export class GameGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;
  private readonly logger: Logger = new Logger('GameGateway');

  constructor(
    private readonly redisService: RedisService,
    private readonly timerService: TimerService,
    private readonly chessService: ChessService,
    private readonly matchService: MatchService,
    private readonly tokenParserService: TokenParserService,
  ) {}

  // we create socket.id schema if it doesn't exist

  async handleConnection(client: Socket) {
    if (client.request.headers.cookie) {
      try {
        const bearerToken = await this.tokenParserService.returnTokenFromCookie(
          client.request.headers.cookie!,
          'access_token',
        );
        const parsedToken = await this.tokenParserService.verifyToken(
          bearerToken,
          'access_token',
        );
        await this.redisService.client
          .hSet(`chess:socketUser:${parsedToken.username}`, {
            login: parsedToken.username,
            userId: parsedToken.sub,
            socketId: client.id,
          })
          .then(() => {
            this.logger.debug(`User connected: ${parsedToken.username}`);
          });
      } catch (e) {
        if (e.message === 'jwt must be provided') {
          this.logger.warn('No access token located while connecting.');
        } else {
          this.logger.error(`Error while connecting user: ${e.message}`);
        }
        client.disconnect();
      }
    } else {
      client.disconnect();
      this.logger.warn('No cookie provided.');
    }
  }

  async handleDisconnect(client: any) {
    try {
      const token = await this.tokenParserService.returnTokenFromCookie(
        client.request.headers.cookie!,
        'access_token',
      );
      // we don't verify the token because we don't care if it is valid
      // (e.g not expired)
      const user: any = await this.tokenParserService.decode(token);
      if (user) {
        await this.redisService.client
          .del(`chess:socketUser:${user.username}`)
          .then(() => {
            this.logger.debug(`User disconnected: ${user.username}`);
          });
      } else {
        this.logger.warn('No access token located while disconnecting.');
      }
    } catch (e) {
      if (e.message === 'jwt must be provided') {
        // pass
      } else {
        this.logger.error(`Error while disconnecting user: ${e.message}`);
      }
    }
  }

  // ALL OF THE STUFF
  // TODO: create move guard, which will test if user can submit the move,
  // additionaly to just being authenticated - context.swtichToWs().getData()
  // and then parse the game id which is submited

  @UseGuards(WsGuard)
  @SubscribeMessage('move-made')
  async handleMadeMove(client: AuthorizedSocket, payload: any): Promise<void> {
    let timer;
    // if the timer is not going than the user is trying to cheat the system some way
    // so timer must be running to make a move
    try {
      timer = await this.timerService.getInterval(
        payload.gameId,
        payload.color,
      );
    } catch (e) {
      this.logger.error(e.message);
      throw new WsException(
        "Timer for this user and color does not exist, cannot proceed with a move while it's not running.",
      );
    }

    if (timer) {
      const cachedMatch = await this.redisService.client.hGetAll(
        `chess:match:${payload.gameId}`,
      );

      const isUserAuthorizedToMove = await this.verifyCorrectMatchColor(
        payload.color,
        client.user,
        cachedMatch,
      );

      if (isUserAuthorizedToMove) {
        const blackUser = await this.redisService.client.hGetAll(
          `chess:socketUser:${cachedMatch.black}`,
        );
        const whiteUser = await this.redisService.client.hGetAll(
          `chess:socketUser:${cachedMatch.white}`,
        );

        const moveMade = await this.chessService.makeMove(
          payload.gameId,
          payload.move,
          payload.color,
        );

        if (moveMade) {
          const timeLeft = await this.timerService.stopTimer(
            payload.gameId,
            payload.color,
          );

          this.server
            .to(blackUser.socketId)
            .emit('move-made-successfully', { ...payload, timeLeft: timeLeft });
          this.server
            .to(whiteUser.socketId)
            .emit('move-made-successfully', { ...payload, timeLeft: timeLeft });
        } else {
          this.logger.error('Move was not successful.');
        }

        if (moveMade?.result && moveMade?.reason) {
          // if there is a result the game is over
          // we delete timers in redis - none should be in motion
          await this.timerService.deleteRedisTimers(payload.gameId);
          await this.matchService.deleteMatchCache(payload.gameId);

          this.server
            .to(blackUser.socketId)
            .emit(moveMade.reason, { color: payload.color, ...moveMade });
          this.server
            .to(whiteUser.socketId)
            .emit(moveMade.reason, { color: payload.color, ...moveMade });
        } else {
          // the game is not over, start timer of the opposing player and dispatch all the stuff
          let startedTimer: string | null;
          switch (payload.color) {
            case 'white':
              startedTimer = await this.timerService.startTimer(
                payload.gameId,
                'black',
              );
              this.server.to(blackUser.socketId).emit('started-timer', {
                color: 'black',
                timeLeft: startedTimer,
              });

              this.server.to(whiteUser.socketId).emit('started-timer', {
                color: 'black',
                timeLeft: startedTimer,
              });
              break;
            case 'black':
              startedTimer = await this.timerService.startTimer(
                payload.gameId,
                'white',
              );
              this.server.to(whiteUser.socketId).emit('started-timer', {
                color: 'white',
                timeLeft: startedTimer,
              });

              this.server.to(blackUser.socketId).emit('started-timer', {
                color: 'white',
                timeLeft: startedTimer,
              });
              break;
            default:
              // well whaddaya know
              break;
          }
        }
      } else {
        throw new WsException('User not authorized to make this move.');
      }
    }
  }

  @UseGuards(WsGuard)
  @SubscribeMessage('resign')
  async handleResignation(
    client: AuthorizedSocket,
    payload: any,
  ): Promise<void> {
    const cachedMatch = await this.redisService.client.hGetAll(
      `chess:match:${payload.gameId}`,
    );
    const isUserAllowed = await this.verifyCorrectMatchColor(
      payload.color,
      client.user!,
      cachedMatch,
    );

    if (isUserAllowed) {
      try {
        await this.timerService.stopTimer(payload.gameId, 'white');
      } catch (e) {
        this.logger.verbose('Timer does not exist for white, not destroyed.');
      }

      try {
        await this.timerService.stopTimer(payload.gameId, 'black');
      } catch (e) {
        this.logger.verbose('Timer does not exist for white, not destroyed.');
      }
      await this.timerService.deleteRedisTimers(payload.gameId);
      await this.matchService.deleteMatchCache(payload.gameId);

      const blackUser = await this.redisService.client.hGetAll(
        `chess:socketUser:${cachedMatch.black}`,
      );
      const whiteUser = await this.redisService.client.hGetAll(
        `chess:socketUser:${cachedMatch.white}`,
      );

      let gameOver: MoveResult = {
        status: 'loss',
        reason: 'resignation',
        result: null,
      };

      gameOver.result = await this.chessService.endGame(
        'resignation',
        payload.color,
        payload.gameId,
      );

      this.server
        .to(whiteUser.socketId)
        .emit('player-resigned', { color: payload.color, ...gameOver });
      this.server
        .to(blackUser.socketId)
        .emit('player-resigned', { color: payload.color, ...gameOver });
    }
  }

  @UseGuards(WsGuard)
  @SubscribeMessage('offer-draw')
  async handleDrawOffer(client: AuthorizedSocket, payload: any): Promise<void> {
    const cachedMatch = await this.redisService.client.hGetAll(
      `chess:match:${payload.gameId}`,
    );
    const isUserAllowed = await this.verifyCorrectMatchColor(
      payload.color,
      client.user!,
      cachedMatch,
    );
    const wasDrawRecentlyDeclined = await this.redisService.client.get(
      `drawDeclined:${payload.gameId}`,
    );

    if (isUserAllowed && !wasDrawRecentlyDeclined) {
      // we will compare offer colors when accepting
      // when the colors are different it means that the offer is accepted
      // by the correct player
      await this.redisService.client.hSet(`activeDrawOffer:${payload.gameId}`, {
        offererColor: payload.color,
        whiteId: cachedMatch.whiteId,
        blackId: cachedMatch.blackId,
        white: cachedMatch.white,
        black: cachedMatch.black,
      });

      // if user decides to somehow abort the draw offer without resolving the key will just die
      await this.redisService.client.expire(
        `activeDrawOffer:${payload.gameId}`,
        60 * 20,
      );

      // TODO: emit 'draw-offered' event to player that did NOT offer the draw (the oponent)
      // SWITCH CASE to see who is the oponent
      switch (payload.color) {
        case 'white':
          // emit to black player
          const blackUser = await this.redisService.client.hGetAll(
            `chess:socketUser:${cachedMatch.black}`,
          );
          this.server.to(blackUser.socketId).emit('draw-offered');
          break;
        case 'black':
          // emit to white player
          const whiteUser = await this.redisService.client.hGetAll(
            `chess:socketUser:${cachedMatch.white}`,
          );
          this.server.to(whiteUser.socketId).emit('draw-offered');
          break;
      }
    }
  }

  @UseGuards(WsGuard)
  @SubscribeMessage('accept-draw')
  async handleAcceptDraw(
    client: AuthorizedSocket,
    payload: any,
  ): Promise<void> {
    const drawOffer = await this.redisService.client.hGetAll(
      `activeDrawOffer:${payload.gameId}`,
    );
    // we user drawOffer insetead of cachedMatch because it has the same ID properties
    const isUserAllowed = await this.verifyCorrectMatchColor(
      payload.color,
      client.user,
      drawOffer,
    );

    if (drawOffer && isUserAllowed && payload.color != drawOffer.offererColor) {
      await this.redisService.client.del(`activeDrawOffer:${payload.gameId}`);

      try {
        await this.timerService.stopTimer(payload.gameId, 'white');
      } catch (e) {
        this.logger.verbose('Timer does not exist for white, not destroyed.');
      }

      try {
        await this.timerService.stopTimer(payload.gameId, 'black');
      } catch (e) {
        this.logger.verbose('Timer does not exist for white, not destroyed.');
      }
      await this.timerService.deleteRedisTimers(payload.gameId);
      await this.matchService.deleteMatchCache(payload.gameId);

      let draw_result: MoveResult = {
        status: 'draw',
        reason: 'agreed_draw',
        result: null,
      };

      draw_result.result = await this.chessService.endGame(
        'agreed_draw',
        payload.color,
        payload.gameId,
      );

      const blackUser = await this.redisService.client.hGetAll(
        `chess:socketUser:${drawOffer.black}`,
      );
      const whiteUser = await this.redisService.client.hGetAll(
        `chess:socketUser:${drawOffer.white}`,
      );

      this.server
        .to(blackUser.socketId)
        .emit('agreed_draw', { color: payload.color, ...draw_result });
      this.server
        .to(whiteUser.socketId)
        .emit('agreed_draw', { color: payload.color, ...draw_result });
    }
  }

  @UseGuards(WsGuard)
  @SubscribeMessage('decline-draw')
  async handleDeclineDraw(
    client: AuthorizedSocket,
    payload: any,
  ): Promise<void> {
    const drawOffer = await this.redisService.client.hGetAll(
      `activeDrawOffer:${payload.gameId}`,
    );
    // we use drawOffer insetead of cachedMatch because it has the same ID properties
    const isUserAllowed = await this.verifyCorrectMatchColor(
      payload.color,
      client.user,
      drawOffer,
    );

    if (isUserAllowed && drawOffer) {
      await this.redisService.client.del(`activeDrawOffer:${payload.gameId}`);
      // another draw can't be set up for 30s to avoid spamming
      await this.redisService.client.set(`drawDeclined:${payload.gameId}`, 1, {
        EX: 30,
      });
    }
  }

  @OnEvent('timeout')
  async handleGameTimeout(payload: TimeoutEvent) {
    const cachedMatch = await this.redisService.client.hGetAll(
      `chess:match:${payload.gameId}`,
    );
    await this.timerService.stopTimer(payload.gameId, payload.color);
    if (cachedMatch) {
      const result = await this.chessService.endGame(
        'timeout',
        payload.color,
        payload.gameId,
      );
      const endGameResult = {
        status: 'loss',
        reason: 'timeout',
        result: result,
      };
      await this.timerService.deleteRedisTimers(payload.gameId);
      await this.redisService.client.del(`chess:match:${payload.gameId}`);

      const blackUser = await this.redisService.client.hGetAll(
        `chess:socketUser:${cachedMatch.black}`,
      );
      const whiteUser = await this.redisService.client.hGetAll(
        `chess:socketUser:${cachedMatch.white}`,
      );

      this.server
        .to(blackUser.socketId)
        .emit('timeout', { color: payload.color, ...endGameResult });
      this.server
        .to(whiteUser.socketId)
        .emit('timeout', { color: payload.color, ...endGameResult });
    }
  }

  private async verifyCorrectMatchColor(
    color: string,
    user: any,
    cachedMatch: any,
  ): Promise<boolean> {
    if (color === 'white' || color === 'w') {
      return user.sub === cachedMatch.whiteId;
    } else if (color === 'black' || color === 'b') {
      return user.sub === cachedMatch.blackId;
    } else {
      return false;
    }
  }
}