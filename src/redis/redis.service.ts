import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

import { RedisIndex } from './indexes/redis-index.interface';
import { LobbyRedisIndex } from './indexes/lobby-redis.index';
import { MatchRedisIndex } from './indexes/match-redis.index';
import { SocketUserRedisIndex } from './indexes/socket-user-redis.index';

@Injectable()
export class RedisService implements OnModuleInit{
  public client: ReturnType<typeof createClient>;
  private readonly indexes: RedisIndex[] = [
    new MatchRedisIndex(),
    new LobbyRedisIndex(),
    new SocketUserRedisIndex(),
  ];
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {
    this.client = createClient({
      url: this.configService.get<string>('REDIS_URI'),
    });
    this.client.connect().then(() => {
      this.logger.log('Redis initialized.');
    });
  }

  onModuleInit() {
    this.setupRedisearchIndexes();
  }

  setupRedisearchIndexes() {
    this.indexes.forEach((index) => {
      this.client.ft
        .create(index.name, index.schema, index.options)
        .then((value) => {
          if (value == 'OK') {
            this.logger.debug(`Finished setup for index ${index.name}.`);
          }
        })
        .catch((err) => {
          if (err.message === 'Index already exists') {
            this.logger.verbose(
              `Index exists already, skipped creation for ${index.name}.`,
            );
          } else {
            this.logger.error('Error occured: ', err);
          }
        });
    });
  }
}
