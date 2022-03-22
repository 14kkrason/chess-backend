import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class JwtInterceptor implements NestInterceptor {
  constructor(private readonly authService: AuthService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    let request = context.switchToHttp().getRequest();
    let response = context.switchToHttp().getResponse();
    try {
      if (request.headers.cookie) {
        // get refresh token
        const refreshTokenCookie = await this.authService.returnTokenFromCookie(
          request.headers.cookie!,
          'refresh_token',
        );
        const refreshToken = await this.authService.verifyToken(
          refreshTokenCookie,
          'refresh_token',
        );

        // get access token


        const accessTokenCookie = await this.authService.returnTokenFromCookie(
          request.headers.cookie!,
          'access_token',
        );
        const accessToken = await this.authService.verifyToken(
          accessTokenCookie,
          'access_token',
        );

        response.locals.access_token = accessToken;
        response.locals.refresh_token = refreshToken;
      }
    } catch (e) {
      console.log(e);
    } finally {
      return next.handle();
    }
  }
}
