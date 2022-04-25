import { Injectable } from '@nestjs/common';
import { UsersManagmentService } from 'src/users-managment/users-managment.service';
import { Chess } from 'chess.js';
import { CreateLobbyDto } from './dtos/createLobby.dto';
import { MatchService } from './match.service';
import { Lobby } from './interfaces/lobby.interface';
import { Match } from './schemas/match.schema';
import { RedisService } from 'src/redis/redis.service';
import { MatchClientInformation } from './interfaces/matchClientInformation.interface';

@Injectable()
export class ChessService {
  constructor(
    private readonly userMangamentService: UsersManagmentService,
    private readonly matchService: MatchService,
    private readonly redisService: RedisService,
  ) {}

  // TODO: move this to match service
  // TODO: create new DTO for player creation
  async createMatch(
    newPlayer: CreateLobbyDto,
    lobby: Lobby,
  ): Promise<MatchClientInformation> {
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
    await this.matchService.create({ ...match, pgn });

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
        match.blackId!,
        match.white!,
        match.black!,
      ),
    ]);

    return {
      newPlayer: {
        gameId: match.gameId,
        color: randomizer % 2 === 0 ? 'white' : 'black',
        type: match.type,
      },
      lobbyPlayer: {
        gameId: match.gameId,
        color: randomizer % 2 === 0 ? 'black' : 'white',
        type: match.type,
      },
    };
  }

  // TODO: create method for ending games
  async endGame() {

  }

  async makeMove(gameId: string, move: string) {
    const match = await this.matchService.getMatch(gameId);
    if(!match) {
      throw new Error('Match does not exist');
    }
    const chess = new Chess();
    chess.load_pgn(match?.pgn);
    const newMove = chess.move(move, { sloppy: true }); 
    const pgn = await this.matchService.updatePgn(gameId, chess.pgn({ newline_char: '\n' }));
    console.log(pgn!.pgn);
    console.log(newMove);
    if (pgn) {
      return true;
    }
    return false;
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
