import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as cookie from 'cookie';

@Injectable()
export class TokenParserService {

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

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
}
