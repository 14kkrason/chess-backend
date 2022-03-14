import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuid } from 'uuid';

import { RedisService } from 'src/redis/redis.service';

import { Match } from './schemas/match.schema';
import { Lobby } from './interfaces/lobby.interface';
import { SchemaFieldTypes } from 'redis';
import { CreateLobbyDto } from './dtos/createLobby.dto';

@Injectable()
export class GameService {
  private readonly logger: Logger = new Logger('GameService');

  constructor(
    private readonly redisService: RedisService,
  ) {}

  async findGame(): Promise<Match> {
    return {
      gameId: '123',
      black: '123',
      white: '123',
      pgn: '123',
      fen: '123',
      ongoing: true,
      date: Date.now(),
      result: '1/2-1/2'
    };
  }

  async createLobby(createLobbyDto: CreateLobbyDto): Promise<Lobby> {
    // TODO: this could probably be happening on module instantiation,
    // not every time lobby is created ;)
    try {
      await this.redisService.client.ft.create(
        'idx:lobby',
        {
          gameId: SchemaFieldTypes.TEXT,
          creationTime: SchemaFieldTypes.NUMERIC,
          playerName: SchemaFieldTypes.TEXT,
          playerElo: SchemaFieldTypes.NUMERIC,
          playerSocketId: SchemaFieldTypes.TEXT
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

    const gameId = uuid();
    const lobby = {
      gameId: gameId,
      creationTime: Date.now(),
      playerName: createLobbyDto.playerName,
      playerElo: createLobbyDto.playerElo,
      playerSocketId: createLobbyDto.playerSocketId
    };

    await this.redisService.client.hSet(`chess:lobby:${gameId}`, lobby);
    return lobby;
  }

  async deleteLobby(id: string): Promise<boolean> {
    try {
      const result = await this.redisService.client.del(`chess:lobby:${id}`);
      return Boolean(result);
    }
    catch (e) {
      this.logger.debug(`Error while deleting lobby: ${e}`);
      return false;
    }
  }
}
