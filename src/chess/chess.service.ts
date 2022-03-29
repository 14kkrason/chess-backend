import { Injectable } from '@nestjs/common';
import { UsersManagmentService } from 'src/users-managment/users-managment.service';
import { Chess } from 'chess.js';
import { CreateLobbyDto } from './dtos/createLobby.dto';
import { MatchService } from './match.service';
import { Lobby } from './interfaces/lobby.interface';
import { Match } from './schemas/match.schema';
import { RedisService } from 'src/redis/redis.service';
import { GameGateway } from './game.gateway';

@Injectable()
export class ChessService {
  constructor(
    private readonly userMangamentService: UsersManagmentService,
    private readonly matchService: MatchService,
    private readonly redisService: RedisService,
  ) {}


  // TODO: move this to match service
  async createMatch(newPlayer: CreateLobbyDto, lobby: Lobby) {
    const randomizer = Math.floor(Math.random() * 100);
    const newPlayerDbUser = await this.userMangamentService.findOne({
      username: newPlayer.playerName,
    });
    const lobbyDbUser = await this.userMangamentService.findOne({
      username: lobby.playerName,
    });

    const match = {
      gameId: lobby.gameId,
      type: lobby.gameType,
      date: Date.now(),
      white: randomizer % 2 === 0 ? newPlayer.playerName : lobby.playerName,
      black: randomizer % 2 === 0 ? lobby.playerName : newPlayer.playerName,
      whiteId:
        randomizer % 2 === 0
          ? newPlayerDbUser?.accountId
          : lobbyDbUser?.accountId,
      blackId:
        randomizer % 2 === 0
          ? lobbyDbUser?.accountId
          : newPlayerDbUser?.accountId,
      whiteElo: randomizer % 2 === 0 ? newPlayer.playerElo : lobby.playerElo,
      blackElo: randomizer % 2 === 0 ? lobby.playerElo : newPlayer.playerElo,
    };

    const pgn = await this.generateStartingPGN(match);
    const result = await this.matchService.create({ ...match, pgn });

    await Promise.all([
      // TODO: we can uncomment this later, we dont care now, will only mess things
     /*  this.userMangamentService.addNewGame(
        { accountId: newPlayerDbUser?.accountId },
        match.gameId,
      ),
      this.userMangamentService.addNewGame(
        { accountId: lobbyDbUser?.accountId },
        match.gameId,
      ), */
      this.matchService.createMatchCache(
        match.gameId!,
        match.type!,
        match.whiteId!,
        match.blackId!
      )
    ]);

    if(randomizer % 2 === 0) {
      // new player is white
      // TODO: finish this function and get on with implementing gameplay
      // we will set this in a public cookie
    }
    else {
      // new player is black
      console.log('White: ', match.white);
      console.log('Black: ', match.black);
    }

    // console.log(result);
  }

  private async generateStartingPGN(match: Partial<Match>): Promise<string> {
    const chess = new Chess();
    chess.header(
      'white',
      match.white!,
      'black',
      match.black!,
      'whiteElo',
      match.whiteElo!.toString(),
      'blackElo',
      match.blackElo!.toString(),
      'date',
      new Date(match.date!).toLocaleDateString(),
    );

    return chess.pgn({ newline_char: '\n' });
  }
}
