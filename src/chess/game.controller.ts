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
} from '@nestjs/common';

import { GameService } from './game.service';

import { FindMatchDto } from './dtos/findMatch.dto';
import { CreateLobbyDto } from './dtos/createLobby.dto';

import { Lobby } from './interfaces/lobby.interface';
import { Match } from './schemas/match.schema'
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RedisService } from '../redis/redis.service';

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
  constructor(private readonly gameService: GameService, private readonly redisService: RedisService) {}

  @UseGuards(JwtAuthGuard)
  @Post('match')
  async handleMatchSearch(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Match | null> {
    console.log(req.user!);
    return {
      gameId: '123',
      black: '123',
      white: '123',
      pgn: '123',
      fen: '123',
      ongoing: true,
      date: Date.now(),
      result: '1/2-1/2'
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('match/:id')
  async handleGetMatch(@Param('id') id: string): Promise<Match> {
    return {
      gameId: '123',
      black: '123',
      white: '123',
      pgn: '123',
      fen: '123',
      ongoing: true,
      date: Date.now(),
      result: '1/2-1/2'
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('lobby')
  async handleLobbyCreation(
    @Body() createLobbyDto: CreateLobbyDto,
  ): Promise<Lobby> {
    const lobby = await this.gameService.createLobby(createLobbyDto);
    return lobby;
  }

  @UseGuards(JwtAuthGuard)
  @Delete('lobby/:id')
  async handleLobbyDeletion(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const deleteLobby = await this.gameService.deleteLobby(id);
    if (deleteLobby) {
      res.status(HttpStatus.OK).send();
    }
    res.status(HttpStatus.NOT_FOUND).send();
  }
}
