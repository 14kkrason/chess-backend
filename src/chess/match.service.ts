import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SchemaFieldTypes } from 'redis';
import { RedisService } from 'src/redis/redis.service';
import { Match, MatchDocument } from './schemas/match.schema';

@Injectable()
export class MatchService {
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
    white: string,
    black: string,
  ) {
    return this.redisService.client.hSet(`chess:match:${gameId}`, {
      gameId: gameId,
      gameType: gameType,
      whiteId: whiteId,
      blackId: blackId,
      white: white,
      black: black,
      whiteReady: 0,
      blackReady: 0,
    });
  }

  async deleteMatchCache(gameId: string): Promise<number> {
    return this.redisService.client.del(`chess:match:${gameId}`);
  }

  async getMatch(gameId: string) {
    return this.matchModel.findOne({ gameId: gameId });
  }

  async updatePgn(gameId: string, pgn: string) {
    return this.matchModel.findOneAndUpdate({ gameId: gameId }, { pgn: pgn });
  }

  async updateEloChange(
    gameId: string,
    blackEloChange: number,
    whiteEloChange: number,
  ) {
    return this.matchModel.findOneAndUpdate(
      { gameId: gameId },
      { blackEloChange: blackEloChange, whiteEloChange: whiteEloChange },
    );
  }

  async endMatch(gameId: string, result: string) {
    return this.matchModel.findOneAndUpdate(
      { gameId: gameId },
      { ongoing: false, result: result },
    );
  }

  async getProfileGameInformation(gameIds: string[]) {
    return this.matchModel.find(
      { gameId: { $in: gameIds } },
      {
        gameId: 1,
        type: 1,
        date: 1,
        whiteElo: 1,
        blackElo: 1,
        white: 1,
        black: 1,
        result: 1,
        pgn: 1,
      },
    );
  }
}
