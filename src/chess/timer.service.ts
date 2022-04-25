import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { RedisService } from 'src/redis/redis.service';
@Injectable()
export class TimerService {
  private readonly logger: Logger = new Logger(TimerService.name);
  constructor(
    private readonly redisService: RedisService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async createRedisTimers(gameId: string, gameType: string): Promise<boolean> {
    let time: number;
    switch (gameType) {
      case 'bullet':
        time = 180;
        break;
      case 'blitz':
        time = 300;
        break;
      case 'rapid':
        time = 900;
        break;
      default:
        return false;
    }
    await this.redisService.client.set(`timer:white:${gameId}`, time);
    await this.redisService.client.set(`timer:black:${gameId}`, time);
    return true;
  }

  async deleteRedisTimers(gameId: string): Promise<boolean> {
    try {
      await this.redisService.client.del(`timer:white:${gameId}`);
      await this.redisService.client.del(`timer:black:${gameId}`);
      return true;
    } catch (e) {
      this.logger.error(`Error while deleting timers: ${e.message}`);
      return false;
    }
  }

  async startTimer(gameId: string, color: string): Promise<string | null> {
    const cb = async (gameId: string, color: string) => {
      const timeLeft = await this.redisService.client.decr(
        `timer:${color}:${gameId}`,
      );

      if (timeLeft == 0) {
        // we should signal that the game is over
      }
    };

    const redisTimer = await this.redisService.client.get(
      `timer:${color}:${gameId}`,
    );

    if (!redisTimer) {
      return null;
    }

    // we create a timer that decreases number of seconds by one every second
    try {
      const timer = setInterval(cb, 1000, gameId, color);
      this.schedulerRegistry.addInterval(`timer:${color}:${gameId}`, timer);
      this.logger.verbose('Timer created.');
    } catch (e) {
      const timerErrorMatcher = /Interval with the given/gm;
      if (e.message.match(timerErrorMatcher)) {
        this.logger.debug('This timer already exists, we ignore creation.');
      } else {
        this.logger.error(e.message);
      }
    } finally {
      return redisTimer;
    }
  }

  // stop timer and return remaining time
  async stopTimer(gameId: string, color: string): Promise<string | null> {
    this.schedulerRegistry.deleteInterval(`timer:${color}:${gameId}`);
    this.logger.verbose('Timer destroyed.');
    return this.redisService.client.get(`timer:${color}:${gameId}`);
  }

  async getInterval(gameId: string, color: string): Promise<any> {
    return this.schedulerRegistry.getInterval(`timer:${color}:${gameId}`);
  }

  async getIntervals(): Promise<string[]> {
    return this.schedulerRegistry.getIntervals();
  }

  // TODO: when game is deleted, the intervals should be deleted
}
