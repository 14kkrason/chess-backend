import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';

import { SchemaFieldTypes } from 'redis';
import { Server, Socket } from 'socket.io';

import { RedisService } from '../redis/redis.service';
import { AuthService } from '../auth/auth.service';
import { WsGuard } from '../auth/guards/ws.guard';

// Gateway responsible for handling moves,
// game creation and such
@WebSocketGateway({
  cors: { origin: 'null' },
  withCredentials: true,
  cookie: { name: 'test', httpOnly: true },
})
export class GameGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;
  private readonly logger: Logger = new Logger('GameGateway');

  constructor(
    private readonly redisService: RedisService,
    private readonly authService: AuthService,
  ) {}

  // we create socket.id schema if it doesn't exist
  async afterInit(server: Server) {
    try {
      await this.redisService.client.ft.create(
        'idx:socketUser',
        {
          login: SchemaFieldTypes.TEXT,
          userId: SchemaFieldTypes.TEXT,
          socketId: SchemaFieldTypes.TEXT,
        },
        {
          ON: 'HASH',
          PREFIX: 'chess:socketUser',
        },
      );
    } catch (e) {
      if (e.message === 'Index already exists') {
        this.logger.verbose('Index exists already, skipped creation.');
      } else {
        this.logger.error('Error occured: ', e);
      }
    }
  }

  async handleConnection(client: Socket) {
    if (client.request.headers.cookie) {
      try {
        const bearerToken = await this.authService.returnTokenFromCookie(
          client.request.headers.cookie!,
          'access_token',
        );
        const decodedToken = await this.authService.verifyToken(
          bearerToken,
          'access_token',
        );
        await this.redisService.client
          .hSet(`chess:socketUser:${decodedToken.username}`, {
            login: decodedToken.username,
            socketId: client.id,
          })
          .then(() => {
            this.logger.debug(`User connected: ${decodedToken.username}`);
          });
      } catch (e) {
        if (e.message === 'jwt must be provided') {
          this.logger.warn('No access token located while connecting.');
        } else {
          this.logger.error(`Error while connecting user: ${e.message}`);
        }
        client.disconnect();
      }
    } else {
      client.disconnect();
      this.logger.warn('No cookie provided.');
    }
  }

  async handleDisconnect(client: any) {
    try {
      const token = await this.authService.returnTokenFromCookie(
        client.request.headers.cookie!,
        'access_token'
      );
      // we don't verify the token because we don't care if it is valid
      // (e.g not expired)
      const user: any = await this.authService.decode(token);
      if (user) {
        await this.redisService.client
          .del(`chess:socketUser:${user.username}`)
          .then(() => {
            this.logger.debug(`User disconnected: ${user.username}`);
          });
      } else {
        this.logger.warn('No access token located while disconnecting.');
      }
    } catch (e) {
      if (e.message === 'jwt must be provided') {
        // pass
      } else {
        this.logger.error(`Error while disconnecting user: ${e.message}`);
      }
    }
  }

  // ALL OF THE STUFF
  // TODO: create move guard, which will test if user can submit the move,
  // additionaly to just being authenticated - context.swtichToWs().getData()
  // and then parse the game id which is submited
  @UseGuards(WsGuard)
  @SubscribeMessage('message')
  handleMessage(client: any, payload: any): void {
    this.logger.log(payload);
  }
}
