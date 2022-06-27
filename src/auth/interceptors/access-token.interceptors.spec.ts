import { createMock } from '@golevelup/ts-jest';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { lastValueFrom, of } from 'rxjs';
import { TokenParserService } from '../token-parser.service';
import { AccessTokenInterceptor } from './access-token.interceptor';

// create the mock CallHandler for the interceptor

describe('AcessTokenInterceptor', () => {
  let interceptor: AccessTokenInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessTokenInterceptor,
        {
          provide: TokenParserService,
          useValue: {
            returnTokenFromCookie: jest
              .fn()
              .mockImplementation((cookie: any, type: string) => {
                if (cookie.isCorrect) {
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

    interceptor = module.get<AccessTokenInterceptor>(AccessTokenInterceptor);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should return access token when correct', async () => {
    let context = createMock<ExecutionContext>();

    context.switchToHttp().getRequest.mockReturnValue({
      headers: {
        cookie: {
          isCorrect: true,
        },
      },
    });

    // we pass a fake locals object to see if it has our value
    context.switchToHttp().getResponse.mockReturnValue({
      locals: {},
    });

    let handler = createMock<CallHandler>({
      handle: () => of({}),
    });

    const interceptedToken = await interceptor.intercept(context, handler);
    const _ = await lastValueFrom(interceptedToken);
    const response = context.switchToHttp().getResponse();

    expect(response).toStrictEqual({
      locals: { access_token: 'correct cookie' },
    });
  });

  it('should return undefined when incorrect', async () => {
    let context = createMock<ExecutionContext>();

    context.switchToHttp().getRequest.mockReturnValue({
      headers: {
        cookie: {
          isCorrect: false,
        },
      },
    });

    // we pass a fake locals object to see if it has our value
    context.switchToHttp().getResponse.mockReturnValue({
      locals: {},
    });

    let handler = createMock<CallHandler>({
      handle: () => of({}),
    });

    const interceptedToken = await interceptor.intercept(context, handler);
    const _ = await lastValueFrom(interceptedToken);
    const response = context.switchToHttp().getResponse();

    expect(response).toStrictEqual({ locals: { access_token: undefined } });
  });

  it('should return undefined when cookie not provided', async () => {
    let context = createMock<ExecutionContext>();

    context.switchToHttp().getRequest.mockReturnValue({
      headers: {},
    });

    // we pass a fake locals object to see if it has our value
    context.switchToHttp().getResponse.mockReturnValue({
      locals: {},
    });

    let handler = createMock<CallHandler>({
      handle: () => of({}),
    });

    const interceptedToken = await interceptor.intercept(context, handler);
    const _ = await lastValueFrom(interceptedToken);
    const response = context.switchToHttp().getResponse();
    expect(response).toStrictEqual({ locals: { access_token: undefined } });
  });
});
