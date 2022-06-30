import { Injectable } from '@nestjs/common';
import { Lobby } from './interfaces/lobby.interface';

@Injectable()
export class MatchCreatorService {
  constructor() {}

  async createMatch(
    lobby: Lobby,
    lobbySearchUser: {
      playerName: string;
      gameType: string;
      playerElo: number;
    },
  ) {
    // TODO: do some logic here
  }
}
