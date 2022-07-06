import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import { MatchGateway } from '../match/match.gateway';
import { TimerService } from '../timer/timer.service';
import { TokenParserService } from '../auth/token-parser.service';
import { MatchCreatorService } from '../match/match-creator.service';
import { LobbyCreatorService } from './lobby-creator.service';
import { LobbyDeleterService } from './lobby-deleter.service';
import { LobbySearchService } from './lobby-search.service';
import { LobbyController } from './lobby.controller';
import { Match } from 'src/match/schemas/match.schema';

// findLobby mock values

const dbUser = {
  username: 'user123',
  eloBullet: 800,
  eloBlitz: 800,
  eloRapid: 800,
};

const goodLobby = {
  gameId: '123512da21d',
  gameType: 'bullet',
  creationTime: '21372132123',
  playerName: 'user456',
  playerElo: 815,
};

// findLobby responses

const lobbyFoundResult = {
  lobby: {
    gameId: '123512da21d',
    gameType: 'bullet',
    creationTime: '21372132123',
    playerName: 'user456',
    playerElo: 815,
  },
  lobbySearchUser: {
    playerName: 'user123',
    gameType: 'bullet',
    playerElo: 800,
  },
};

const lobbyNotFoundResult = {
  lobby: null,
  lobbySearchUser: {
    playerName: 'user123',
    gameType: 'bullet',
    playerElo: 800,
  },
};

const lobbyUserNotFoundResult = {
  lobby: null,
  lobbySearchUser: null,
};

describe('LobbyController', () => {
  let controller: LobbyController;
  let lobbySearchService: LobbySearchService;
  let lobbyCreatorService: LobbyCreatorService;
  let lobbyDeleterService: LobbyDeleterService;
  let matchCreatorService: MatchCreatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LobbyController],
      providers: [
        {
          provide: LobbySearchService,
          useValue: {
            findLobby: jest
              .fn()
              .mockImplementation((username: string, gameType: string) => {
                if (
                  username === dbUser.username &&
                  gameType === goodLobby.gameType
                ) {
                  return lobbyFoundResult;
                } else if (
                  username === dbUser.username &&
                  gameType != goodLobby.gameType
                ) {
                  return lobbyNotFoundResult;
                } else if (
                  username === dbUser.username &&
                  gameType != goodLobby.gameType
                ) {
                  return lobbyUserNotFoundResult;
                } else {
                  return lobbyUserNotFoundResult;
                }
              }),
          },
        },
        {
          provide: LobbyCreatorService,
          useValue: {
            createLobby: jest
              .fn()
              .mockImplementation(
                (user: {
                  playerName: string;
                  gameType: string;
                  playerElo: number;
                }) => {
                  // pass, we do not care
                },
              ),
          },
        },
        {
          provide: LobbyDeleterService,
          useValue: {
            deleteLobby: jest.fn().mockImplementation((username: string) => {
              if (username === dbUser.username) {
                return true;
              }
              return false;
            }),
          },
        },
        {
          provide: MatchCreatorService,
          useValue: {
            createMatchInDatabase: jest
              .fn()
              .mockImplementation((_lobby: any, _lobbySearchUser: any) => {
                return createMock<Match>();
              }),
            createMatchInCache: jest
              .fn()
              .mockImplementation(
                (
                  gameId: string,
                  gameType: string,
                  whiteId: string,
                  blackId: string,
                  white: string,
                  black: string,
                ) => {
                  // pass, we do not care
                },
              ),
          },
        },
        {
          provide: TokenParserService,
          useValue: {
            // we use nothing for dependency issues
          },
        },
        {
          provide: TimerService,
          useValue: {
            createRedisTimers: jest.fn().mockReturnValue(null),
          },
        },
        {
          provide: MatchGateway,
          useValue: {
            sendMatchStartInfoToPlayers: jest.fn().mockReturnValue(null),
          },
        },
      ],
    }).compile();

    controller = module.get<LobbyController>(LobbyController);
    lobbySearchService = module.get<LobbySearchService>(LobbySearchService);
    lobbyCreatorService = module.get<LobbyCreatorService>(LobbyCreatorService);
    lobbyDeleterService = module.get<LobbyDeleterService>(LobbyDeleterService);
    matchCreatorService = module.get<MatchCreatorService>(MatchCreatorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleFindLobby', () => {
    it('should create match when lobby is found', async () => {
      let request = createMock<Request>();
      let response = createMock<Response>();

      request.body.type = 'bullet';
      response.locals.access_token = {
        username: 'user123',
      };

      response.status.mockImplementation((code: number) => {
        expect(code).toBe(200);
        return {} as Response;
      });

      response.json.mockImplementation((body: any) => {
        expect(body).toStrictEqual({
          message: 'Match found, expect a response in a minute.',
        });
        return {} as Response;
      });

      await controller.handleFindLobby(request, response);
      /* expect(result).toStrictEqual({
        message: 'Match found, expect a response in a minute.',
      }); */
      expect(lobbySearchService.findLobby).toBeCalled();
      expect(lobbyDeleterService.deleteLobby).toBeCalled();
      expect(matchCreatorService.createMatchInDatabase).toBeCalled();
    });

    it('should create lobby when one was not found', async () => {
      let request = createMock<Request>();
      let response = createMock<Response>();

      request.body.type = 'rapid';
      response.locals.access_token = {
        username: 'user123',
      };

      response.status.mockImplementation((code: number) => {
        expect(code).toBe(201);
        return {} as Response;
      });

      response.json.mockImplementation((body: any) => {
        expect(body).toStrictEqual({
          message:
            'Match not found, lobby was created instead. Waiting for a match to start.',
        });
        return {} as Response;
      });

      const result = await controller.handleFindLobby(request, response);
      /* expect(result).toStrictEqual({
        message:
          'Match not found, lobby was created instead. Waiting for a match to start.',
      }); */
      expect(lobbySearchService.findLobby).toBeCalled();
      expect(lobbyCreatorService.createLobby).toBeCalled();
    });

    it('should return bad request when user was not found', async () => {
      let request = createMock<Request>();
      let response = createMock<Response>();

      request.body.type = 'rapid';
      response.locals.access_token = {
        username: 'wrong_username',
      };

      response.status.mockImplementation((code: number) => {
        expect(code).toBe(400);
        return {} as Response;
      });

      response.json.mockImplementation((body: any) => {
        expect(body).toStrictEqual({
          message:
            'Either username did not match any we have in the DB or the chosen gametype was incorrect. Please try again.',
        });
        return {} as Response;
      });

      const result = await controller.handleFindLobby(request, response);
      /* expect(result).toStrictEqual({
        message:
          'Either username did not match any we have in the DB or the chosen gametype was incorrect. Please try again.',
      }); */
      console.log(result);
      expect(lobbySearchService.findLobby).toBeCalled();
    });
  });
});
