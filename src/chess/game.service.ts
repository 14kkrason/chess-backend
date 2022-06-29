import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';

import { RedisService } from 'src/redis/redis.service';

import { Lobby } from './interfaces/lobby.interface';
import { CreateLobbyDto } from './dtos/createLobby.dto';
import { UsersManagmentService } from 'src/users-managment/users-managment.service';
import { ChessService } from './chess.service';
import { GameGateway } from './game.gateway';
import { MatchClientInformation } from './interfaces/matchClientInformation.interface';
import { TimerService } from './timer.service';
import { MatchService } from './match.service';

@Injectable()
export class GameService {
  private readonly logger: Logger = new Logger(GameService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly usersManagmentService: UsersManagmentService,
    private readonly chessService: ChessService,
    private readonly gameGateway: GameGateway,
    private readonly timerService: TimerService,
    private readonly matchService: MatchService,
  ) {}

  async findGame(
    username: string,
    gameType: string,
  ): Promise<Partial<MatchClientInformation> | boolean> {
    try {
      // we get the needed user data
      const dbUser = await this.usersManagmentService.findOne({
        username: username,
      });

      let elo;
      switch (gameType) {
        case 'bullet':
          elo = dbUser?.eloBullet;
          break;
        case 'blitz':
          elo = dbUser?.eloBlitz;
          break;
        case 'rapid':
          elo = dbUser?.eloRapid;
          break;
        default:
          throw new Error('Invalid game type.');
      }

      const gameUser: CreateLobbyDto = {
        playerName: dbUser!.username,
        gameType: gameType,
        playerElo: elo!,
      };

      let isSearchOngoing = true;
      let eloDifference = 10;
      let lobby: any;
      // TODO: change these values later
      while (isSearchOngoing && eloDifference <= 200) {
        lobby = await this.redisService.client.ft.search(
          'idx:lobby',
          `@gameType:${gameUser.gameType} @playerElo:[${
            gameUser.playerElo - eloDifference
          } ${gameUser.playerElo + eloDifference}]`,
        );
        if (lobby.total) {
          isSearchOngoing = false;
        } else {
          eloDifference = eloDifference + 30;
        }
      }

      let matchInfo: MatchClientInformation;
      let matchLobby: Lobby;
      switch (lobby.total) {
        case 0:
          await this.createLobby(gameUser);
          return false;
        case 1:
          matchLobby = lobby.documents[0].value;
          matchInfo = await this.chessService.createMatch(gameUser, matchLobby);
          break;
        default:
          // get lobby that is waiting for the longest time (https://www.youtube.com/watch?v=a_XgQhMPeEQ)
          let lobbies = lobby.documents.sort((a: Lobby, b: Lobby) =>
            a.creationTime > b.creationTime ? 1 : -1,
          );
          matchLobby = lobbies[0];
          matchInfo = await this.chessService.createMatch(gameUser, matchLobby);
          break;
      }

      await this.timerService.createRedisTimers(
        matchInfo.newPlayer.gameId,
        gameType,
      );
      await this.deleteLobby(matchLobby.playerName);

      const lobbyUser = await this.redisService.client.hGetAll(
        `chess:socketUser:${matchLobby.playerName}`,
      );
      
      this.gameGateway.server
        .to(lobbyUser.socketId)
        .emit('found-game', matchInfo.lobbyPlayer);

      return { newPlayer: matchInfo.newPlayer };
    } catch (e) {
      this.logger.error(e.message);
      return false;
    }
  }

  async getOngoingGameData(gameId: string, requesterColor: string) {
    // we signal we are ready to play, when don't care if we already did
    const gameIdentifier = `chess:match:${gameId}`;
    const playerReady = `${requesterColor}Ready`;
    await this.redisService.client.hSet(gameIdentifier, playerReady, 1);

    const cachedMatch = await this.redisService.client.hGetAll(
      `chess:match:${gameId}`,
    );

    if (cachedMatch.gameId == null) {
      await this.redisService.client.del(gameIdentifier);
      return {
        status: 'game-ended',
        message: 'Game already ended or has not started yet',
      };
    }

    if (cachedMatch.whiteReady === '1' && cachedMatch.blackReady === '1') {
      // both players are ready, we send the info to them
      const whiteSocketUser = await this.redisService.client.hGetAll(
        `chess:socketUser:${cachedMatch.white}`,
      );
      const blackSocketUser = await this.redisService.client.hGetAll(
        `chess:socketUser:${cachedMatch.black}`,
      );

      const match = await this.matchService.getMatch(gameId);

      if (!match) {
        // there should probably be some graceful handling
        // of this abomination of a case
        throw new Error('Match was null, game aborted???');
      }

      const whiteTimer = await this.redisService.client.get(
        `timer:white:${gameId}`,
      );
      const blackTimer = await this.redisService.client.get(
        `timer:black:${gameId}`,
      );

      this.gameGateway.server
        .to(whiteSocketUser.socketId)
        .emit('game-is-ready', {
          ...cachedMatch,
          whiteTimer: whiteTimer,
          blackTimer: blackTimer,
          pgn: match.pgn,
          color: 'w',
        });

      this.gameGateway.server
        .to(blackSocketUser.socketId)
        .emit('game-is-ready', {
          ...cachedMatch,
          whiteTimer: whiteTimer,
          blackTimer: blackTimer,
          pgn: match.pgn,
          color: 'b',
        });
      return { status: 'game-is-ready', message: 'Game data was returned' };
    } else {
      return { status: 'game-not-ready', message: 'Game is not ready yet.' }
    }
  }

  private async createLobby(createLobbyDto: CreateLobbyDto): Promise<Lobby> {
    const gameId = uuid();
    const lobby = {
      gameId: gameId,
      creationTime: Date.now(),
      gameType: createLobbyDto.gameType,
      playerName: createLobbyDto.playerName,
      playerElo: createLobbyDto.playerElo,
    };

    await this.redisService.client.hSet(`chess:lobby:${gameId}`, lobby);
    return lobby;
  }

  async deleteLobby(username: string): Promise<boolean> {
    try { 
      const lobby = await this.redisService.client.ft.search(
        'idx:lobby',
        `@playerName:${username}`,
      );
      await this.redisService.client.del(lobby.documents[0].id);
      return true;
    } catch (e) {
      this.logger.debug(`Error while deleting lobby: ${e.message}`);
      return false;
    }
  }
}
