import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as cookie from 'cookie';
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
  ) {}

  async validateUser(username: string, password: string) {
    const user = await this.usersManagmentService.findOne(username);
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
    const payload = { username: user.username, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  // using default secret key
  async decode(token: string) {
    return this.jwtService.decode(token);
  }

  async revokeRefreshToken(username: string) {
    await this.usersManagmentService.updateRefreshToken(username, '');
  }

  async issueRefreshToken(user: ValidatedUser) {
    const payload = { username: user.username, role: user.role, id: uuid() };
    await this.usersManagmentService.updateRefreshToken(
      user.username,
      payload.id,
    );
    const signedPayload = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('REFRESH_SECRET'),
      expiresIn: '1d',
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

  async returnTokenFromCookie(token: string, type: string): Promise<string>{
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
}
