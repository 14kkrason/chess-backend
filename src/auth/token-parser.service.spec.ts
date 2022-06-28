import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { TokenParserService } from './token-parser.service';

import * as cookie from 'cookie';

jest
  .spyOn(cookie, 'parse')
  .mockImplementation(
    (token: string, options?: cookie.CookieParseOptions | undefined) => {
      if (token == mockCorrectAccessToken) {
        return { access_token: token } as { [key: string]: string };
      }

      if (token == mockCorrectRefreshToken) {
        return { refresh_token: token } as { [key: string]: string };
      }

      return { key: 'string' };
    },
  );

let mockCorrectAccessToken = 'correct_access_token';

let mockCorrectRefreshToken = 'correct_refresh_token';

describe('TokenParserService', () => {
  let service: TokenParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenParserService,
        {
          provide: JwtService,
          useValue: {
            verify: jest
              .fn()
              .mockImplementation((token: string, options?: any) => {
                if (
                  [mockCorrectAccessToken, mockCorrectRefreshToken].includes(
                    token,
                  )
                ) {
                  return token;
                }

                throw new Error('invalid token');
              }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('ASecret'),
          },
        },
      ],
    }).compile();

    service = module.get<TokenParserService>(TokenParserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('decode', () => {
    // this method just wraps decode method
    // so we won't test it
  });

  describe('returnTokenFromCookie', () => {
    it('should return correct tokens when token cookie field exists', async () => {
      const accessToken = await service.returnTokenFromCookie(
        mockCorrectAccessToken,
        'access_token',
      );
      const refreshToken = await service.returnTokenFromCookie(
        mockCorrectRefreshToken,
        'refresh_token',
      );

      expect(accessToken).toBe(mockCorrectAccessToken);
      expect(refreshToken).toBe(mockCorrectRefreshToken);
    });

    it('should return empty string when token cookie is incorrect', async () => {
      const wrongToken = await service.returnTokenFromCookie(
        'wrong_token',
        'access_token',
      );

      expect(wrongToken).toBe('');
    });

    it('should return empty string when type of token is not correct', async () => {
      const wrongToken = await service.returnTokenFromCookie(
        'wrong_token',
        'incorrect_token_type',
      );

      expect(wrongToken).toBe('');
    });
  });

  describe('verifyToken', () => {
    it('should return token when correct', async () => {
      const accessToken = await service.verifyToken(
        mockCorrectAccessToken,
        'access_token',
      );
      const refreshToken = await service.verifyToken(
        mockCorrectRefreshToken,
        'refresh_token',
      );

      expect(accessToken).toBe(mockCorrectAccessToken);
      expect(refreshToken).toBe(mockCorrectRefreshToken);
    });

    it('should return undefined when incorrect token or type',  async () => {
      const incorrectToken = await service.verifyToken(
        'incorrect_token',
        'access_token',
      );
      const incorrectType = await service.verifyToken(
        mockCorrectRefreshToken,
        'incorrect_type',
      );

      const incorrectTokenAndType = await service.verifyToken(
        'incorrect_token',
        'incorrect_type',
      );

      expect(incorrectToken).toBeUndefined();
      expect(incorrectType).toBeUndefined();
      expect(incorrectTokenAndType).toBeUndefined();
    })
  });
});
