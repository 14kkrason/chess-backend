import { Test, TestingModule } from '@nestjs/testing';
import { UserValidationService } from './user-validation.service';
import { ValidatedUser } from './interfaces/validated-user.interface';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UsersManagmentService } from '../users-managment/users-managment.service';

const mockUser = {
  username: 'user123',
  role: 'user',
  password: 'pa$$word_1',
};

const validatedUser: ValidatedUser = {
  username: 'user123',
  role: 'user',
};

jest.spyOn(bcrypt, 'compare').mockImplementation((password, hashPassword) => {
  if(password == hashPassword) {
    return true;
  }
  return false;
})

describe('UserValidationService', () => {
  let service: UserValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserValidationService,
        {
          provide: UsersManagmentService,
          useValue: {
            findOne: jest
              .fn()
              .mockImplementation((username: any) => {
                if (username.username == 'user123') {
                  return mockUser;
                }
                return null;
              }),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest
              .fn()
              .mockImplementation((payload: any, options: any) => {
                // we don't really care how it gets signed
                return 'signed token';
              })
          }
        }
      ],
    }).compile();

    service = module.get<UserValidationService>(UserValidationService);
  });

  describe('validateUser', () => {

    it('should be defined', () => {
      expect(service).toBeDefined();
    })

    it('should return validated user when correct data is passed', async () => {
      const result = await service.validateUser('user123', 'pa$$word_1');
      expect(result).toStrictEqual(validatedUser);
    });

    it('should return null when user not found', async () => {
      const result =await  service.validateUser('nonExistentUser', 'some_password');
      expect(result).toBeNull();
    });

    it('should return null when password not a match', async () => {
      const result = await service.validateUser('user123', 'wrong_password');
      expect(result).toBeNull();
    });
  });

  // this method will never be called with incorrect data
  // as all sanity checks are done in LocalAuthGuard
  // via validateUser method tested above
  // unit testing is thus trivial
  describe('login', () => {

    it('should return access token', async () => {
      const result = await service.login(validatedUser);
      expect(result).toStrictEqual({ access_token: 'signed token' });
    })
  });;
});
