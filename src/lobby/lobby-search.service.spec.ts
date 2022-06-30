import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { createClient } from 'redis';
import { UsersManagmentService } from '../users-managment/users-managment.service';
import { RedisService } from '../redis/redis.service';
import { LobbyCreatorService } from './lobby-creator.service';
import { LobbySearchService } from './lobby-search.service';

const lobbySearchUser = {
  playerName: 'user123',
  gameType: 'bullet',
  playerElo: 800,
};

const goodLobby = {
  gameId: '123512da21d',
  gameType: 'bullet',
  creationTime: '21372132123',
  playerName: 'user456',
  playerElo: 815,
};

const dbUser = {
  username: 'user123',
  eloBullet: 800,
  eloBlitz: 800,
  eloRapid: 800,
};

describe('LobbySearchService', () => {
  let service: LobbySearchService;
  let redisService: RedisService;
  let userManagemenetService: UsersManagmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LobbySearchService,
        {
          provide: RedisService,
          useValue: {
            client: createMock<typeof createClient>({
              hSet: () => {
                return 1;
              },
              ft: {
                search: jest
                  .fn()
                  .mockImplementation((_: string, query: string) => {
                    const splitQuery = query.split(' ');
                    if (splitQuery[0] == `@gameType:${goodLobby.gameType}`) {
                      // we dont simulate elo searches because it does not matter
                      return {
                        total: 1,
                        documents: [
                          {
                            id: 'some_identifier',
                            value: { ...goodLobby },
                          },
                        ],
                      };
                    } else {
                      return {
                        total: 0,
                        documents: [],
                      };
                    }
                  }),
              },
            }),
          },
        },
        {
          provide: UsersManagmentService,
          useValue: {
            findOne: jest
              .fn()
              .mockImplementation((query: { username: string }) => {
                if (query.username === dbUser.username) {
                  return dbUser;
                }
                return null;
              }),
          },
        },
      ],
    }).compile();

    service = module.get<LobbySearchService>(LobbySearchService);
    redisService = module.get<RedisService>(RedisService);
    userManagemenetService = module.get<UsersManagmentService>(
      UsersManagmentService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should find a lobby with correct inputs', async () => {
    const lobby = await service.findLobby('user123', 'bullet');
    expect(lobby.lobby).toStrictEqual(goodLobby);
    expect(lobby.lobbySearchUser).toStrictEqual(lobbySearchUser);
    expect(userManagemenetService.findOne).toBeCalledTimes(1);
    expect(redisService.client.ft.search).toBeCalled();
  });

  it('should return null lobby when none was found', async () => {
    const lobby = await service.findLobby('user123', 'rapid');
    expect(lobby.lobby).toBeNull();
    expect(lobby.lobbySearchUser).toStrictEqual({
      playerName: 'user123',
      gameType: 'rapid',
      playerElo: 800,
    });
    expect(userManagemenetService.findOne).toBeCalledTimes(1);
    expect(redisService.client.ft.search).toBeCalled();
  });

  it('should return all nulls when user was not found', async () => {
    const lobby = await service.findLobby('wrong_user', 'rapid');
    expect(lobby.lobby).toBeNull();
    expect(lobby.lobbySearchUser).toBeNull();
    expect(userManagemenetService.findOne).toBeCalledTimes(1);
    expect(redisService.client.ft.search).toBeCalledTimes(0);
  });
});
