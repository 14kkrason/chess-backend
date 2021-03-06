import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TokenParserService } from '../token-parser.service';

@Injectable()
export class RefreshTokenInterceptor implements NestInterceptor {
  logger: Logger = new Logger(RefreshTokenInterceptor.name);
  constructor(
    private readonly tokenParserService: TokenParserService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    let request = context.switchToHttp().getRequest();
    let response = context.switchToHttp().getResponse();
    try {
      if (request.headers.cookie) {
        // get access token
        const refreshTokenCookie =
          await this.tokenParserService.returnTokenFromCookie(
            request.headers.cookie!,
            'refresh_token',
          );
        const refreshToken = await this.tokenParserService.verifyToken(
          refreshTokenCookie,
          'refresh_token',
        );

        response.locals.refresh_token = refreshToken;
      } else {
        response.locals.refresh_token = undefined;
      }
    } catch (e) {
      if (e.message === 'jwt must be provided') {
        this.logger.debug(`No refresh token for user: ${e.message}`);
      } else {
        this.logger.error(e.message);
      }
    } finally {
      return next.handle();
    }
  }
}
