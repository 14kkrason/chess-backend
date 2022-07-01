import {
  Controller,
  Delete,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MatchCreatorService } from '../match/match-creator.service';

import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { AccessTokenInterceptor } from '../auth/interceptors/access-token.interceptor';
import { LobbyCreatorService } from './lobby-creator.service';
import { LobbyDeleterService } from './lobby-deleter.service';
import { LobbySearchService } from './lobby-search.service';

@Controller('lobby-management')
export class LobbyController {
  constructor(
    private readonly lobbySearchService: LobbySearchService,
    private readonly lobbyCreatorService: LobbyCreatorService,
    private readonly lobbyDeleterService: LobbyDeleterService,
    private readonly matchCreatorService: MatchCreatorService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AccessTokenInterceptor)
  @Post('lobby')
  async handleFindLobby(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const username = res.locals.access_token.username;
    const gameType = req.body.type;

    const findLobbyResult = await this.lobbySearchService.findLobby(
      username,
      gameType,
    );

    if (findLobbyResult.lobby === null && findLobbyResult.lobbySearchUser) {
      const _ = await this.lobbyCreatorService.createLobby(
        findLobbyResult.lobbySearchUser,
      );
      res.status(HttpStatus.CREATED);
      return {
        message:
          'Match not found, lobby was created instead. Waiting for a match to start.',
      };
    } else if (
      findLobbyResult.lobby === null &&
      findLobbyResult.lobbySearchUser === null
    ) {
      // user or gametype were incorrect
      res.status(HttpStatus.BAD_REQUEST);
      return {
        message:
          'Either username did not match any we have in the DB or the chosen gametype was incorrect. Please try again.',
      };
    } else if (findLobbyResult.lobby && findLobbyResult.lobbySearchUser) {
      await this.lobbyDeleterService.deleteLobby(
        findLobbyResult.lobby.playerName,
      );
      await this.matchCreatorService.createMatch(
        findLobbyResult.lobby,
        findLobbyResult.lobbySearchUser,
      );

      res.status(HttpStatus.OK);
      return { message: 'Match found, expect a response in a minute.' };
    }
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AccessTokenInterceptor)
  @Delete('lobby')
  async handleDeleteLobby(@Res({ passthrough: true }) res: Response) {
    const deletedLobby = await this.lobbyDeleterService.deleteLobby(
      res.locals.access_token.username,
    );

    if (deletedLobby) {
      res.status(HttpStatus.OK);
      return { message: 'OK' };
    } else {
      res.status(HttpStatus.NOT_FOUND);
      return { message: 'NOT_FOUND' };
    }
  }
}
