import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as cookie from 'cookie';
import { RedisService } from '../redis/redis.service';
import { User } from '../users-managment/schemas/user.schema';
import { v4 as uuid } from 'uuid';
import { UsersManagmentService } from '../users-managment/users-managment.service';
import { ValidatedUser } from './interfaces/validated-user.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly usersManagmentService: UsersManagmentService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  // using default secret key
  async decode(token: string) {
    return this.jwtService.decode(token);
  }

  async verifyToken(token: string, type: string) {
    let return_token;
    switch (type) {
      case 'access_token':
        return_token = this.jwtService.verify(token);
        break;
      case 'refresh_token':
        return_token = this.jwtService.verify(token, {
          secret: this.configService.get<string>('REFRESH_SECRET'),
        });
        break;
      default:
        break;
    }
    return return_token;
  }

  async returnTokenFromCookie(token: string, type: string): Promise<string> {
    let return_token = '';
    switch (type) {
      case 'access_token':
        return_token = cookie.parse(token).access_token;
        break;
      case 'refresh_token':
        return_token = cookie.parse(token).refresh_token;
      default:
        break;
    }
    return return_token;
  }

  async isPlayerAllowedToStartTimer(
    gameId: string,
    playerId: string,
    color: string,
  ): Promise<boolean> {
    const cachedMatch = await this.redisService.client.hGetAll(
      `chess:match:${gameId}`,
    );
    if (!cachedMatch) {
      return false;
    }

    if (color === 'white' || color === 'w') {
      return playerId === cachedMatch.whiteId;
    } else if (color === 'black' || color === 'b') {
      return playerId === cachedMatch.blackId;
    }

    return false;
  }
}
