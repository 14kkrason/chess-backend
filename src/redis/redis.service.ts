import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType, RedisModules, RedisScripts} from 'redis';


// this service is only exposing the client
@Injectable()
export class RedisService {
  public client: ReturnType<typeof createClient>;
  // TODO: setup publisher and subscriber for all your publish/subscribe needs
  private readonly logger = new Logger('RedisService');

  constructor(private readonly configService: ConfigService) {
    this.client = createClient({
      url: this.configService.get<string>('REDIS_URI'),
    });
    this.client.connect().then(() => {
      this.logger.log('Redis initialized.');
    });
  }
}
