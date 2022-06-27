import { createMock } from '@golevelup/ts-jest';
import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TokenParserService } from '../token-parser.service';
import { WsGuard } from './ws.guard';

// create the mock CallHandler for the interceptor

describe('WsGuard', () => {
  let guard: WsGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WsGuard,
        {
          provide: TokenParserService,
          useValue: {
            returnTokenFromCookie: jest
              .fn()
              .mockImplementation((cookie: any, type: string) => {
                if (cookie!.isCorrect) {
                  return { access_token: 'correct cookie' };
                } else if (!cookie.isCorrect) {
                  return { access_token: 'mal cookie' };
                }
                return undefined;
              }),
            verifyToken: jest.fn().mockImplementation((token, type) => {
              if (token.access_token === 'correct cookie') {
                return 'correct cookie';
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    guard = module.get<WsGuard>(WsGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true when cookie is correct', async () => {
    let context = createMock<ExecutionContext>();

    context.switchToWs().getClient.mockReturnValue({
      request: {
        headers: {
          cookie: {
            isCorrect: true,
          },
        },
      },
    });

    const result = await guard.canActivate(context);
    const client = context.switchToWs().getClient() as any;
    expect(result).toBe(true);
    expect(client.user).toStrictEqual('correct cookie');
  });

  it('should return false when cookie is incorrect', async () => {
    let context = createMock<ExecutionContext>();

    context.switchToWs().getClient.mockReturnValue({
      request: {
        headers: {
          cookie: {
            isCorrect: false,
          },
        },
      },
    });

    const result = await guard.canActivate(context);
    const client = context.switchToWs().getClient() as any;
    expect(result).toBe(false);
    expect(client.user).toBeUndefined();
  });

  it('should return false when cookie not provided', async () => {
    let context = createMock<ExecutionContext>();

    context.switchToWs().getClient.mockReturnValue({
      request: {
        headers: {
          cookie: {},
        },
      },
    });

    const result = await guard.canActivate(context);
    const client = context.switchToWs().getClient() as any;
    expect(result).toBe(false);
    expect(client.user).toBeUndefined();
  });
});
