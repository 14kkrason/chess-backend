import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RedisService } from '../redis/redis.service';
import { User } from '../users-managment/schemas/user.schema';
import { UsersManagmentService } from '../users-managment/users-managment.service';
import { Lobby } from './interfaces/lobby.interface';
import { Match, MatchDocument } from './schemas/match.schema';

@Injectable()
export class MatchCreatorService {
  private readonly logger: Logger = new Logger(MatchCreatorService.name);
  constructor(
    @InjectModel(Match.name) private readonly matchModel: Model<MatchDocument>,
    private readonly usersManagemenetSercice: UsersManagmentService,
    private readonly redisService: RedisService
  ) {}

  async createMatchInDatabase(
    lobby: Lobby,
    lobbySearchUser: {
      playerName: string;
      gameType: string;
      playerElo: number;
    },
  ) {
    const userFromLobby = await this.usersManagemenetSercice.findOne({
      username: lobby.playerName,
    });

    const userSearchingForGame = await this.usersManagemenetSercice.findOne({
      username: lobbySearchUser.playerName,
    });

    if (userFromLobby === null || userSearchingForGame === null) {
      return null;
    }

    const match = await this.randomizeMatchData(
      lobby,
      lobbySearchUser,
      userFromLobby,
      userSearchingForGame,
    );

    const matchModel = new this.matchModel({
      ...match,
    });
    return matchModel.save();
  }

  async createMatchInCache(
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

  private async randomizeMatchData(
    lobby: Lobby,
    lobbySearchUser: {
      playerName: string;
      gameType: string;
      playerElo: number;
    },
    userFromLobby: User,
    userSearchingForGame: User,
  ) {
    const randomizer = Math.floor(Math.random() * 100);
    const match = {
      gameId: lobby.gameId,
      type: lobby.gameType,
      date: Date.now(),
      white:
        randomizer % 2 === 0
          ? userSearchingForGame.username
          : userFromLobby.username,
      black:
        randomizer % 2 === 0
          ? userFromLobby.username
          : userSearchingForGame.username,
      whiteId:
        randomizer % 2 === 0
          ? userSearchingForGame.accountId
          : userFromLobby.accountId,
      blackId:
        randomizer % 2 === 0
          ? userFromLobby.accountId
          : userSearchingForGame.accountId,
      whiteElo:
        randomizer % 2 === 0 ? lobbySearchUser.playerElo : lobby.playerElo,
      blackElo:
        randomizer % 2 === 0 ? lobby.playerElo : lobbySearchUser.playerElo,
    };
    return match;
  }
}
