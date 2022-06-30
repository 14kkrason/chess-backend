import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { createClient } from 'redis';
import { identity } from 'rxjs';
import { RedisService } from '../redis/redis.service';
import { LobbyDeleterService } from './lobby-deleter.service';

const username = 'user123';

describe('LobbyDeleterService', () => {
  let service: LobbyDeleterService;
  let redisService: RedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LobbyDeleterService,
        {
          provide: RedisService,
          useValue: {
            client: createMock<typeof createClient>({
              ft: {
                search: jest
                  .fn()
                  .mockImplementation((_: string, query: string) => {
                    if (query == `@playerName:${username}`) {
                      return {
                        total: 1,
                        documents: [
                          {
                            id: 123,
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
              del: jest.fn().mockImplementation(() => {
                return 1;
              }),
            }),
          },
        },
      ],
    }).compile();

    service = module.get<LobbyDeleterService>(LobbyDeleterService);
    redisService = module.get<RedisService>(RedisService);
  });

  /*  afterEach(() => {
    jest.clearAllMocks();
  }) */

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return true when delete was successful', async () => {
    const result = await service.deleteLobby(username);
    expect(result).toBe(true);
    expect(redisService.client.ft.search).toBeCalledTimes(1);
    expect(redisService.client.del).toBeCalledTimes(1);
  });

  it('should return false when delete failed', async () => {
    const result = await service.deleteLobby('wrong_username');
    expect(result).toBe(false);
    expect(redisService.client.ft.search).toBeCalledTimes(1);
    expect(redisService.client.del).toBeCalledTimes(0);
  });
});
