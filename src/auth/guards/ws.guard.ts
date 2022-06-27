import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { TokenParserService } from '../token-parser.service';

@Injectable()
export class WsGuard implements CanActivate {
  private readonly logger: Logger = new Logger(WsGuard.name);
  constructor(
    private readonly tokenParserService: TokenParserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<any> {
    let socket = context.switchToWs().getClient();

    const bearerToken = await this.tokenParserService
    .returnTokenFromCookie(
      socket.request.headers.cookie!,
      'access_token',
    );
    try {
      const decodedToken = (await this.tokenParserService.verifyToken(
        bearerToken,
        'access_token',
      )) as any;
      if (decodedToken) {
        // we decoded the token so it is safe to asume it works
        socket.user = decodedToken;
        return true;
      } else {
        this.logger.error(`Error while authorizing socket: can't verify JWT`);
        return false;
      }
    } catch (e) {
      this.logger.error(`Error while authorizing socket: ${e.message}`);
      return false;
    }
  }
}
