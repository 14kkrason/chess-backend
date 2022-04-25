import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as cookie from 'cookie';
import { RedisService } from 'src/redis/redis.service';
import { User } from 'src/users-managment/schemas/user.schema';
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

  async validateUser(username: string, password: string) {
    const user = await this.usersManagmentService.findOne({
      username: username,
    });
    if (!user) {
      this.logger.log(`User ${username} not found. Validation failed.`);
      return null;
    }
    const validate = await bcrypt.compare(password, user!.password);
    if (validate) {
      const result: ValidatedUser = {
        username: user.username,
        role: user.role,
      };
      this.logger.verbose(`User ${username} vaildated succesfuly.`);
      return result;
    }
    this.logger.log(
      `Password is not a match for user ${username}. Validation failed.`,
    );
    return null;
  }

  async login(user: ValidatedUser) {
    const dbUser = await this.usersManagmentService.findOne({
      username: user.username,
    });
    const payload = { username: user.username, role: user.role };
    return {
      access_token: this.jwtService.sign(payload, {
        subject: dbUser?.accountId,
      }),
    };
  }

  // using default secret key
  async decode(token: string) {
    return this.jwtService.decode(token);
  }

  async revokeRefreshToken(user: Partial<User>) {
    await this.usersManagmentService.updateRefreshToken(user, '');
  }

  async issueRefreshToken(user: ValidatedUser) {
    const dbUser = await this.usersManagmentService.findOne({
      username: user.username,
    });
    const payload = { id: uuid() };
    await this.usersManagmentService.updateRefreshToken(user, payload.id);
    const signedPayload = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('REFRESH_SECRET'),
      expiresIn: '604800000',
      subject: dbUser?.accountId,
    });
    return {
      refresh_token: signedPayload,
    };
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
    if(!cachedMatch) {
      return false;
    }

    if (color === 'white' || color === 'w') {
      return playerId === cachedMatch.whiteId;
    }
    else if (color === 'black' || color === 'b') {
      return playerId === cachedMatch.blackId;
    }

    return false;
  }
}
