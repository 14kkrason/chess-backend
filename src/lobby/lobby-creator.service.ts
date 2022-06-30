import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class LobbyCreatorService {
  constructor(
    private readonly redisService: RedisService,
  ) {}

  async createLobby(lobbySearchUser: {
    playerName: string;
    gameType: string;
    playerElo: number;
  }) {
    const gameId = uuid();
    const lobby = {
      gameId: gameId,
      creationTime: Date.now(),
      gameType: lobbySearchUser.gameType,
      playerName: lobbySearchUser.playerName,
      playerElo: lobbySearchUser.playerElo,
    };

    await this.redisService.client.hSet(`chess:lobby:${gameId}`, lobby);
    return lobby;
  }
}
