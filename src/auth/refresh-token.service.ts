import { Injectable } from '@nestjs/common';
import { User } from '../users-managment/schemas/user.schema';
import { UsersManagmentService } from '../users-managment/users-managment.service';
import { v4 as uuid } from 'uuid';
import { ValidatedUser } from './interfaces/validated-user.interface';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly usersManagmentService: UsersManagmentService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

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
      expiresIn: '7d',
      subject: dbUser?.accountId,
    });
    return {
      refresh_token: signedPayload,
    };
  }
}
