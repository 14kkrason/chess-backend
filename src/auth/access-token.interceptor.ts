import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class AccessTokenInterceptor implements NestInterceptor {
  logger: Logger = new Logger(AccessTokenInterceptor.name);
  constructor(private readonly authService: AuthService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    let request = context.switchToHttp().getRequest();
    let response = context.switchToHttp().getResponse();
    try {
      if (request.headers.cookie) {
        // get access token
        const accessTokenCookie = await this.authService.returnTokenFromCookie(
          request.headers.cookie!,
          'access_token',
        );
        const accessToken = await this.authService.verifyToken(
          accessTokenCookie,
          'access_token'
        );

        response.locals.access_token = accessToken;
      }
    } catch (e) {
      if (e.message === 'jwt must be provided') {
        this.logger.debug(`No access token for user: ${e.message}`);
      }
      else {
        this.logger.error(e.message);
      }
      
    } finally {
      return next.handle();
    }
  }
}
