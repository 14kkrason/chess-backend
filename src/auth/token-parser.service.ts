import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as cookie from 'cookie';

@Injectable()
export class TokenParserService {
  private readonly logger: Logger = new Logger(TokenParserService.name);
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async decode(token: string) {
    return this.jwtService.decode(token);
  }

  async verifyToken(token: string, type: string) {
    let return_token;
    try {
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
    } catch (e) {
      this.logger.error(e.message);
    } finally {
      return return_token;
    }
  }

  async returnTokenFromCookie(token: string, type: string): Promise<string> {
    const parsed_token = cookie.parse(token);
    if (parsed_token[type]) {
      return parsed_token[type];
    }
    return '';
  }
}
