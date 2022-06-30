import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { createClient } from 'redis';
import { RedisService } from '../redis/redis.service';
import { LobbyCreatorService } from './lobby-creator.service';

const lobbySearchUser = {
  playerName: 'user123',
  gameType: 'rapid',
  playerElo: 1234,
};

describe('LobbyCreatorService', () => {
  let service: LobbyCreatorService;
  let redisService: RedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LobbyCreatorService,
        {
          provide: RedisService,
          useValue: {
            client: createMock<typeof createClient>({
              hSet: () => {
                return 1;
              },
            }),
          },
        },
      ],
    }).compile();

    service = module.get<LobbyCreatorService>(LobbyCreatorService);
    redisService = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create lobby', async () => {
    const lobby = await service.createLobby(lobbySearchUser);
    const user = {
      playerName: lobby.playerName,
      gameType: lobby.gameType,
      playerElo: lobby.playerElo,
    };
    expect(typeof lobby.gameId).toBe('string');
    expect(typeof lobby.creationTime).toBe('number');
    expect(user).toStrictEqual(lobbySearchUser);
    expect(redisService.client.hSet).toBeCalled();
  });
});
