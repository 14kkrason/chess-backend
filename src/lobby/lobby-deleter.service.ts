import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class LobbyDeleterService {
  private logger: Logger = new Logger(LobbyDeleterService.name);
  constructor(private readonly redisService: RedisService) {}

  async deleteLobby(username: string): Promise<boolean> {
    try {
      const lobby = await this.redisService.client.ft.search(
        'idx:lobby',
        `@playerName:${username}`,
      );
      if(lobby.total > 0) {
        await this.redisService.client.del(lobby.documents[0].id);
        return true;
      }
      return false;
    } catch (e) {
      this.logger.debug(`Error while deleting lobby: ${e.message}`);
      return false;
    }
  }
}
