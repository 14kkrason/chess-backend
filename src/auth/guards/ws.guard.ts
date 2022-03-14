import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class WsGuard implements CanActivate {
  private readonly logger: Logger = new Logger(WsGuard.name);
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<any> {
    let socket = context.switchToWs().getClient();
    
    // TODO: when it comes to connection with refresh tokens, 
    // frontend should also for reconnect everytime /api/auth/refresh-token is issued
    const bearerToken = await this.authService.returnAccessTokenFromCookie(
      socket.request.headers.cookie!,
    );
    try {
      const decodedToken = (await this.authService.verifyAccessToken(bearerToken)) as any;
      if (decodedToken) {
        // we decoded the token so it is safe to asume it works
        socket.user = decodedToken;
        return true;
      } else {
        this.logger.error(`Error while authorizing socket: can't verify JWT`)
        return false;
      }
    } catch (e) {
      this.logger.error(`Error while authorizing socket: ${e.message}`)
      return false;
    }
  }
}
