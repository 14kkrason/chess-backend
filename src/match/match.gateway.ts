import { WebSocketGateway } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { RedisService } from '../redis/redis.service';
import { Match } from './schemas/match.schema';

@WebSocketGateway({
  cors: { origin: 'null' },
  withCredentials: true,
  cookie: { name: 'test', httpOnly: true },
})
export class MatchGateway {
  server: Server;
  constructor(private readonly redisService: RedisService) {}

  async sendMatchStartInfoToPlayers(match: Match) {
    const whiteSocketUser = await this.redisService.client.hGetAll(
      `chess:socketUser:${match.white}`,
    );
    const blackSocketUser = await this.redisService.client.hGetAll(
      `chess:socketUser:${match.black}`,
    );

    this.server.to(whiteSocketUser.socketId).emit('found-game', {
      gameId: match.gameId,
      color: 'white',
      type: match.type,
    });

    this.server.to(blackSocketUser.socketId).emit('found-game', {
      gameId: match.gameId,
      color: 'white',
      type: match.type,
    });
  }
}
