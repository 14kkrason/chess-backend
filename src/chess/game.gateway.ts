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
import { AuthService } from '../auth/auth.service';
import { WsGuard } from '../auth/guards/ws.guard';
import { TimerService } from './timer.service';
import { ChessService } from './chess.service';

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
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;
  private readonly logger: Logger = new Logger('GameGateway');

  constructor(
    private readonly redisService: RedisService,
    private readonly authService: AuthService,
    private readonly timerService: TimerService,
    private readonly chessService: ChessService,
  ) {}

  // we create socket.id schema if it doesn't exist
  async afterInit() {
    try {
      await this.redisService.client.ft.create(
        'idx:socketUser',
        {
          login: SchemaFieldTypes.TEXT,
          userId: SchemaFieldTypes.TEXT,
          socketId: SchemaFieldTypes.TEXT,
        },
        {
          ON: 'HASH',
          PREFIX: 'chess:socketUser',
        },
      );
    } catch (e) {
      if (e.message === 'Index already exists') {
        this.logger.verbose('Index exists already, skipped creation.');
      } else {
        this.logger.error('Error occured: ', e);
      }
    }
  }

  async handleConnection(client: Socket) {
    if (client.request.headers.cookie) {
      try {
        const bearerToken = await this.authService.returnTokenFromCookie(
          client.request.headers.cookie!,
          'access_token',
        );
        const parsedToken = await this.authService.verifyToken(
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
      const token = await this.authService.returnTokenFromCookie(
        client.request.headers.cookie!,
        'access_token',
      );
      // we don't verify the token because we don't care if it is valid
      // (e.g not expired)
      const user: any = await this.authService.decode(token);
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
  @SubscribeMessage('message')
  async handleMessage(client: any, payload: any): Promise<void> {
    console.log(payload);
    this.server.to(client.id).emit('found-game', {
      msg: 'This is the information about what went down.',
    });
  }

  @UseGuards(WsGuard)
  @SubscribeMessage('move-made')
  async handleMadeMove(client: AuthorizedSocket, payload: any): Promise<void> {
    console.log(client.user.username)

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
      console.log(
        'There was an attempt to start the timer and it does not go.',
      );
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

        const wasMoveMade = await this.chessService.makeMove(
          payload.gameId,
          payload.move,
        );

        if (wasMoveMade) {
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
          throw new WsException('Failed to make a move');
        }

        if (payload.checkmate || payload.stalemate) {
          this.logger.warn('Game is OVER, initiate ending game.');
        } else {
          // the game is not over, start timer of the opposing player
          let startedTimer: string | null;
          switch (payload.color) {
            case 'white':
              startedTimer = await this.timerService.startTimer(
                payload.gameId,
                'black',
              );
              this.server
                .to(blackUser.socketId)
                .emit('started-timer', startedTimer);
              break;
            case 'black':
              startedTimer = await this.timerService.startTimer(
                payload.gameId,
                'white',
              );
              this.server
                .to(whiteUser.socketId)
                .emit('started-timer', startedTimer);
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
