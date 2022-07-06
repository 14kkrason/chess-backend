import { Injectable } from '@nestjs/common';

@Injectable()
export class TimerService {
  async createRedisTimers(gameId: string, gameType: string) {}
}
