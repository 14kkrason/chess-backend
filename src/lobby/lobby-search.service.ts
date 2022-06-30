import { Injectable } from '@nestjs/common';
import { User } from '../users-managment/schemas/user.schema';
import { UsersManagmentService } from '../users-managment/users-managment.service';
import { RedisService } from '../redis/redis.service';
import { Lobby } from './interfaces/lobby.interface';

@Injectable()
export class LobbySearchService {
  gameTypes: string[] = ['bullet', 'blitz', 'rapid'];
  baseEloDifference: number = 10;
  constructor(
    private readonly userManagementService: UsersManagmentService,
    private readonly redisService: RedisService,
  ) {}

  async findLobby(username: string, gameType: string) {
    const dbUser = await this.userManagementService.findOne({
      username: username,
    });

    if (dbUser && this.gameTypes.includes(gameType)) {
      const lobbySearchUser = {
        playerName: dbUser!.username,
        gameType: gameType,
        playerElo: this.extractElo(dbUser, gameType),
      };

      const lobbies = await this.searchRedisForLobbies(lobbySearchUser);
      if (lobbies?.total === 0 || lobbies?.documents.length === 0) {
        return { lobby: null, lobbySearchUser: lobbySearchUser };
      }

      return {
        lobby: lobbies?.documents
          .map((value) => {
            return value.value as unknown as Lobby;
          })
          .sort((a: Lobby, b: Lobby) => {
            return a.creationTime > b.creationTime ? 1 : -1;
          })[0],
        lobbySearchUser: lobbySearchUser,
      };
    }
    return {lobby: null, lobbySearchUser: null };
  }

  private async searchRedisForLobbies(lobbySearchUser: {
    playerName: string;
    gameType: string;
    playerElo: number;
  }) {
    let isSearchOngoing = true;
    let eloDifference = 10;
    let lobby;
    while (isSearchOngoing && eloDifference <= 200) {
      lobby = await this.redisService.client.ft.search(
        'idx:lobby',
        `@gameType:${lobbySearchUser.gameType} @playerElo:[${
          lobbySearchUser.playerElo - eloDifference
        } ${lobbySearchUser.playerElo + eloDifference}]`,
      );
      if (lobby.total) {
        isSearchOngoing = false;
      } else {
        eloDifference = eloDifference + 30;
      }
    }
    return lobby;
  }

  private extractElo(dbUser: User, gameType: string) {
    const { eloBullet, eloBlitz, eloRapid } = dbUser;
    return [eloBullet, eloBlitz, eloRapid][this.gameTypes.indexOf(gameType)];
  }
}
