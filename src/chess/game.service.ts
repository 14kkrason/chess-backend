import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';

import { RedisService } from 'src/redis/redis.service';

import { Lobby } from './interfaces/lobby.interface';
import { SchemaFieldTypes } from 'redis';
import { CreateLobbyDto } from './dtos/createLobby.dto';
import { UsersManagmentService } from 'src/users-managment/users-managment.service';
import { ChessService } from './chess.service';
import { GameGateway } from './game.gateway';

//await client.ft.search('idx:users', '@age:[0 30]');
@Injectable()
export class GameService implements OnModuleInit {
  private readonly logger: Logger = new Logger(GameService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly usersManagmentService: UsersManagmentService,
    private readonly chessService: ChessService,
    private readonly gameGateway: GameGateway
  ) {}

  async findGame(username: string, gameType: string): Promise<boolean> {
    try {
      // we get the needed user data
      const dbUser = await this.usersManagmentService.findOne({username: username});

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
      while (isSearchOngoing && eloDifference <= 50) {
        lobby = await this.redisService.client.ft.search(
          'idx:lobby',
          `@gameType:${gameUser.gameType} @playerElo:[${
            gameUser.playerElo - eloDifference
          } ${gameUser.playerElo + eloDifference}]`,
        );
        if (lobby.total) {
          isSearchOngoing = false;
        } else {
          eloDifference = eloDifference + 10;
        }
      }

      switch (lobby.total) {
        case 0:
          await this.createLobby(gameUser);
          return false;
        case 1:
          let matchLobby: Lobby = lobby.documents[0].value;
          await this.chessService.createMatch(gameUser, matchLobby);
          break;
        default:
          let lobbies = lobby.documents;
          break;

        // add logic emiting match data to both players - that's how they will find it
      }
    } catch (e) {
      this.logger.error(e.message);
    }
    return true;
  }

  private async createLobby(createLobbyDto: CreateLobbyDto): Promise<Lobby> {
    // TODO: this could probably be happening on module instantiation,
    // not every time lobby is created ;)
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


  async onModuleInit() {
    try {
      await this.redisService.client.ft.create(
        'idx:lobby',
        {
          gameId: SchemaFieldTypes.TEXT,
          gameType: SchemaFieldTypes.TEXT,
          creationTime: SchemaFieldTypes.NUMERIC, 
          playerName: SchemaFieldTypes.TEXT,
          playerElo: SchemaFieldTypes.NUMERIC,
        },
        {
          ON: 'HASH',
          PREFIX: 'chess:lobby',
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
}
