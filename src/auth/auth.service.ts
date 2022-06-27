import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly redisService: RedisService,
  ) {}

  async isPlayerAllowedToStartTimer(
    gameId: string,
    playerId: string,
    color: string,
  ): Promise<boolean> {
    const cachedMatch = await this.redisService.client.hGetAll(
      `chess:match:${gameId}`,
    );
    if (!cachedMatch) {
      return false;
    }

    if (color === 'white' || color === 'w') {
      return playerId === cachedMatch.whiteId;
    } else if (color === 'black' || color === 'b') {
      return playerId === cachedMatch.blackId;
    }

    return false;
  }
}
