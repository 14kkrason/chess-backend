import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigFactory, ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

// this service is only exposing the client
@Injectable()
export class RedisService {
  public client: any;
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
