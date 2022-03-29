import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Res,
  HttpStatus,
  Param,
  Delete,
  UseGuards,
  Req,
  UseInterceptors,
} from '@nestjs/common';

import { GameService } from './game.service';

import { FindMatchDto } from './dtos/findMatch.dto';
import { CreateLobbyDto } from './dtos/createLobby.dto';

import { Lobby } from './interfaces/lobby.interface';
import { Match } from './schemas/match.schema';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RedisService } from '../redis/redis.service';
import { GameGateway } from './game.gateway';
import { AccessTokenInterceptor } from 'src/auth/accessToken.interceptor';

// TODO: Implement logic when match is found:
// When match is found:
// 1. Generate room id -> DONE in createLobby - UUID is game room id
// 2. Create websocket room with this id
// 3. Send them the id as a response
// 4. Cache id in state managment
// 5. Use this id when playing the game and making moves in the ChessboardComponent
// 6. If the game is over do a graceful teardown, destroy the room and such

@Controller('game-managment')
export class GameController {
  private readonly logger: Logger = new Logger('GameController');
  constructor(
    private readonly gameService: GameService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AccessTokenInterceptor)
  @Post('match')
  async handleMatchSearch(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const game = await this.gameService.findGame(
      res.locals.access_token.username,
      req.body.type,
    );
    if (game) {
      return { message: 'Match found!', game: game }
    }
    else {
      return { message: 'Match not found', game: game }
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('match/:id')
  async handleGetMatch(@Param('id') id: string): Promise<any> {
    return {
      gameId: '123',
      black: '123',
      white: '123',
      pgn: '123',
      fen: '123',
      ongoing: true,
      date: Date.now(),
      result: '1/2-1/2',
    };
  }

  // can't play more than one match, no need to identify lobbies by id
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AccessTokenInterceptor)
  @Delete('lobby')
  async handleLobbyDeletion(
    @Res({ passthrough: true }) res: Response,
  ): Promise<any> {
    const deleteLobby = await this.gameService.deleteLobby(res.locals.access_token.username);
    if (deleteLobby) {
      res.status(HttpStatus.OK);
      return { message: "OK" };
    } else {
      res.status(HttpStatus.NOT_FOUND);
      return { message: "NOT_FOUND" };
    }
  }
}
