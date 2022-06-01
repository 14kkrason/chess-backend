import { Injectable } from '@nestjs/common';
import { UsersManagmentService } from 'src/users-managment/users-managment.service';
import { Chess } from 'chess.js';
import { CreateLobbyDto } from './dtos/createLobby.dto';
import { MatchService } from './match.service';
import { Lobby } from './interfaces/lobby.interface';
import { Match } from './schemas/match.schema';
import { RedisService } from 'src/redis/redis.service';
import { MatchClientInformation } from './interfaces/matchClientInformation.interface';

export interface GameResult {
  nWhiteRating: number;
  nBlackRating: number;
  gainWhite: number;
  gainBlack: number;
}

// TODO: change name to something more fitting, 
// TODO: move to separate file
// 
export interface MoveResult {
  status: 'ongoing' | 'draw' | 'loss' | 'win';
  reason: string | null;
  result: GameResult | null;
}

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
    console.log(randomizer);
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
      this.userMangamentService.addNewGame(
        { accountId: newPlayerDbUser?.accountId },
        match.gameId,
      ),
      this.userMangamentService.addNewGame(
        { accountId: lobbyDbUser?.accountId },
        match.gameId,   
      ), 
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

  async makeMove(
    gameId: string,
    move: string,
    color: string,
  ): Promise<MoveResult | null> {
    const match = await this.matchService.getMatch(gameId);
    if (!match) {
      throw new Error('Match does not exist');
    }
    const chess = new Chess();
    chess.load_pgn(match?.pgn);
    const newMove = chess.move(move, { sloppy: true });
    if (newMove) {
      await this.matchService.updatePgn(
        gameId,
        chess.pgn({ newline_char: '\n' }),
      );
    } else {
      console.log('That was NOT a legal move.');
      return null;
    }

    let moveResult: MoveResult = {
      status: 'ongoing',
      reason: null,
      result: null,
    };
    // if the game is over after the move we proceed with ending it
    if (chess.game_over()) {
      if (chess.in_checkmate()) {
        moveResult.result = await this.endGame('checkmate', color, gameId);
        moveResult.status = 'win';
        moveResult.reason = 'checkmate';
        return moveResult;
      } else if (chess.in_stalemate()) {
        moveResult.result = await this.endGame('stalemate', color, gameId);
        moveResult.status = 'draw';
        moveResult.reason = 'stalemate';
        return moveResult;
      } else if (chess.in_threefold_repetition()) {
        moveResult.result = await this.endGame('threefold_repetition', color, gameId);
        moveResult.status = 'draw';
        moveResult.reason = 'threefold_repetition';
        return moveResult;
      } else if (chess.in_draw()) {
        moveResult.result = await this.endGame('draw', color, gameId);
        moveResult.status = 'draw';
        moveResult.reason = 'draw';
        return moveResult;
      }
    }
    return moveResult;
  }

  // TODO: create method for ending games
  async endGame(
    reason: string,
    color: string,
    gameId: string,
  ): Promise<GameResult | null> {
    const match = await this.matchService.getMatch(gameId);
    let result: GameResult | null = null;
    // normaly the invoker is the winner (checkmate)
    // when in draw it doesn't matter
    let resultToString = '0 - 0';
    switch (reason) {
      case 'draw':
      case 'agreed_draw':
      case 'stalemate':
      case 'threefold_repetition':
        result = await this.calculateEloGain(0.5, match);
        resultToString = '1 - 1';
        break;
      case 'checkmate':
        if (color === 'white') {
          result = await this.calculateEloGain(1, match);
          resultToString = '1 - 0'
        } else if (color === 'black') {
          result = await this.calculateEloGain(0, match);
          resultToString = '0 - 1';
        }
        break;
      case 'resignation':
      case 'timeout': 
        // it's reversed because the one who invokes is the loser
        if (color === 'white') {
          result = await this.calculateEloGain(0, match);
          resultToString = '0 - 1';
        } else if (color === 'black') {
          result = await this.calculateEloGain(1, match);
          resultToString = '1 - 0'
        }
        break;
      default:
        throw new Error('Invalid reason for ending game.');
    }
    await this.userMangamentService.updateElo(
      { username: match!.white },
      match!.type,
      result!.nWhiteRating,
      match!.date,
    );
    await this.userMangamentService.updateElo(
      { username: match!.black },
      match!.type,
      result!.nBlackRating,
      match!.date,
    );
    await this.matchService.updateEloChange(
      gameId,
      result!.gainBlack,
      result!.gainWhite,
    );
    await this.matchService.endMatch(gameId, resultToString);
    return result;
  }

  // the color that is passed is the one that initiaties
  // if 1 - white won
  // 0.5 - it's a draw
  // 0 - black won
  // FIDE uses k=40 for more variety in elo gains
  // same for D - FIDE uses 400
  private async calculateEloGain(
    result: number,
    match: any,
  ): Promise<GameResult> {
    const k = 40;
    const d = 400;
    const rWhite = match.whiteElo;
    const rBlack = match.blackElo;
    const eWhite = 1 / (1 + Math.pow(10, (rBlack - rWhite) / d));
    const eBlack = 1 / (1 + Math.pow(10, (rWhite - rBlack) / d));
    let sWhite = result;
    let sBlack;
    switch (result) {
      case 1:
        sBlack = 0;
        break;
      case 0.5:
        sBlack = 0.5;
        break;
      case 0:
        sBlack = 1;
        break;
      default:
        throw new Error('Invalid game result.');
    }

    const gWhite = Math.round(k * (sWhite - eWhite));
    const gBlack = Math.round(k * (sBlack - eBlack));
    const rnWhite = rWhite + gWhite;
    const rnBlack = rBlack + gBlack;

    return {
      nWhiteRating: rnWhite,
      nBlackRating: rnBlack,
      gainWhite: gWhite,
      gainBlack: gBlack,
    };
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
