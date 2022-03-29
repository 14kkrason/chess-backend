import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SchemaFieldTypes } from 'redis';
import { RedisService } from 'src/redis/redis.service';
import { Match, MatchDocument } from './schemas/match.schema';

@Injectable()
export class MatchService implements OnModuleInit {
  private readonly logger = new Logger(MatchService.name);
  constructor(
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
    private readonly redisService: RedisService,
  ) {}

  async create(match: Partial<Match>) {
    const newMatch = new this.matchModel({
      gameId: match.gameId,
      type: match.type,
      date: match.date,
      white: match.white,
      black: match.black,
      whiteId: match.whiteId,
      blackId: match.blackId,
      whiteElo: match.whiteElo,
      blackElo: match.blackElo,
      pgn: match.pgn,
    });
    this.logger.debug(
      `Match created for user pair: ${match.white} - ${match.black}`,
    );
    return newMatch.save();
  }

  async createMatchCache(
    gameId: string,
    gameType: string,
    whiteId: string,
    blackId: string,
  ) {
    return this.redisService.client.hSet(`chess:match:${gameId}`, {
      gameId: gameId,
      gameType: gameType,
      whiteId: whiteId,
      blackId: blackId,
      whiteReady: 0,
      blackReady: 0
    });
  }

  async onModuleInit() {
    try {
      await this.redisService.client.ft.create(
        'idx:match',
        {
          gameId: SchemaFieldTypes.TEXT,
          gameType: SchemaFieldTypes.TEXT,
          whiteId: SchemaFieldTypes.TEXT,
          blackId: SchemaFieldTypes.TEXT,
          whiteReady: SchemaFieldTypes.NUMERIC,
          blackReady: SchemaFieldTypes.NUMERIC
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
