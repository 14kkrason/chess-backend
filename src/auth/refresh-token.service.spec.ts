import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersManagmentService } from '../users-managment/users-managment.service';
import { RefreshTokenService } from './refresh-token.service';

import { v4 as uuid } from 'uuid';

const mockUser = {
  username: 'user123',
  role: 'user',
  accountId: '123',
  refreshToken: 'refresh-token-value',
  email: 'sample@mail.com',
};

// these methods aggregate other methods and depend
// on things that are outside of their scope
// as far as they are concerned they recieve correct data
// as previous methods that pass it perform checks
describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let usersManagmentService: UsersManagmentService;
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        {
          provide: UsersManagmentService,
          useValue: {
            updateRefreshToken: jest
              .fn()
              .mockReturnValue('A database response value'),
            findOne: jest
              .fn()
              .mockImplementation((query: { username: string }) => {
                if (query.username === mockUser.username) {
                  return mockUser;
                }
              }),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('Signed JWT token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('Refresh token secret'),
          },
        },
      ],
    }).compile();

    service = module.get<RefreshTokenService>(RefreshTokenService);
    usersManagmentService = module.get(UsersManagmentService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('revokeRefreshToken', () => {
    it('should revoke token when called', async () => {
      await service.revokeRefreshToken({ username: 'user123' });
      expect(usersManagmentService.updateRefreshToken).toBeCalled();
    });
  });

  describe('issueRefreshToken', () => {
    it('should issue a refresh token', async () => {
      const token = await service.issueRefreshToken({
        username: mockUser.username,
        role: mockUser.role,
      });
      expect(token).toStrictEqual({ refresh_token: 'Signed JWT token' });
      expect(usersManagmentService.findOne).toBeCalled();
      expect(usersManagmentService.updateRefreshToken).toBeCalled();
      expect(jwtService.sign).toBeCalled();
    });
  });
});
