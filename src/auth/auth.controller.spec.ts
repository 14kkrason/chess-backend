import { createMock } from '@golevelup/ts-jest';
import { MailerService } from '@nestjs-modules/mailer';
import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import { UsersManagmentService } from '../users-managment/users-managment.service';
import { AuthController } from './auth.controller';
import { PasswordService } from './password.service';
import { RefreshTokenService } from './refresh-token.service';
import { TokenParserService } from './token-parser.service';
import { UserValidationService } from './user-validation.service';

const mockUser = {
  username: 'user123',
  role: 'user',
  accountId: '123',
  refreshToken: 'refresh-token-value',
  email: 'sample@mail.com',
};

const mockUserWExpiredToken = {
  username: 'user123',
  role: 'user',
  accountId: '123',
  refreshToken: 'expired-refresh-token',
  email: 'sample@mail.com',
};

describe('Auth Controller', () => {
  let controller: AuthController;
  let usersManagmentService: any;
  let mailerService: any;
  let passwordService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: TokenParserService,
          useValue: {
            // we use nothing for dependency issues
          }
        },
        {
          provide: RefreshTokenService,
          useValue: {
            issueRefreshToken: jest
              .fn()
              .mockReturnValue({ refresh_token: 'refresh-token-value' }),

            // this function effectively does nothing in this context
            revokeRefreshToken: jest.fn().mockImplementation((_) => {}),
          },
        },
        {
          provide: UserValidationService,
          useValue: {
            login: jest
              .fn()
              .mockReturnValue({ access_token: 'access-token-value' }),
          },
        },
        {
          provide: UsersManagmentService,
          useValue: {
            findOne: jest.fn().mockImplementation((query: any) => {
              if (query.accountId == mockUser.accountId) {
                return mockUser;
              }
              return null;
            }),
            getUserEmail: jest.fn().mockImplementation((username: string) => {
              if (username == mockUser.username) {
                return { email: mockUser.email };
              }
              return null;
            }),
            changePassword: jest.fn().mockReturnValue({}),
          },
        },
        {
          provide: PasswordService,
          useValue: {
            generatePassword: jest
              .fn()
              .mockReturnValue('damwkmdp2imdp12ompo12dasdadd12'),
          },
        },
        {
          provide: MailerService,
          useValue: {
            sendMail: jest.fn().mockReturnValue('not really important'),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    usersManagmentService = module.get(UsersManagmentService);
    mailerService = module.get(MailerService);
    passwordService = module.get(PasswordService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    // this method is protected by local auth guard
    // so we don't expect it to return any other
    // values besides the correct ones
    it('should return login values', async () => {
      let request = createMock<Request>();
      let response = createMock<Response>();

      request.user = { username: mockUser.username, role: mockUser.role };

      const result = await controller.login(request, response);
      expect(result).toStrictEqual({
        isLoggedIn: true,
        username: mockUser.username,
        role: mockUser.role,
      });
    });
  });

  describe('refreshToken', () => {
    it('should refresh token when it is correct', async () => {
      let request = createMock<Request>();
      let response = createMock<Response>();

      response.locals = {
        refresh_token: { id: mockUser.refreshToken, sub: mockUser.accountId },
      };

      const result = await controller.refreshToken(request, response);
      expect(result).toStrictEqual({
        isLoggedIn: true,
        username: mockUser.username,
        role: mockUser.role,
      });
    });

    it('should reject when no refresh token is found', async () => {
      let request = createMock<Request>();
      let response = createMock<Response>();

      response.locals = {};

      const result = await controller.refreshToken(request, response);
      expect(result).toStrictEqual({
        isLoggedIn: false,
        username: null,
        role: null,
      });
    });

    it('should reject when token is not valid', async () => {
      let request = createMock<Request>();
      let response = createMock<Response>();

      response.locals = {
        refresh_token: {
          id: mockUserWExpiredToken.refreshToken,
          sub: mockUserWExpiredToken.accountId,
        },
      };

      const result = await controller.refreshToken(request, response);
      expect(result).toStrictEqual({
        isLoggedIn: false,
        username: null,
        role: null,
      });
    });
  });

  describe('logout', () => {
    it('should revoke refresh token', async () => {
      // this test is quite trivial
      // it works if there is connection to the database
      // we will not be testing it
      let request = createMock<Request>();
      let response = createMock<Response>();

      response.locals = {
        refresh_token: {
          id: mockUserWExpiredToken.refreshToken,
          sub: mockUserWExpiredToken.accountId,
        },
      };

      const result = await controller.logout(request, response);
      expect(result).toStrictEqual({ message: 'Logout successful.' });
    });
  });

  describe('resetPassword', () => {
    it('should reset password if email is correct', async () => {
      let username = 'user123';
      let email = 'sample@mail.com';

      const result = await controller.resetPassword(username, email);
      expect(result).toStrictEqual({ message: 'Reset recieved' });
      expect(mailerService.sendMail).toBeCalledTimes(1);
      expect(passwordService.generatePassword).toBeCalledTimes(1);
      expect(usersManagmentService.changePassword).toBeCalledTimes(1);
    });
  });
});
