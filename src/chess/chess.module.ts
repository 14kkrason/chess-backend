import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { RedisModule } from 'src/redis/redis.module';
import { ChessService } from './chess.service';
import { UsersManagmentModule } from 'src/users-managment/users-managment.module';
import { GameGateway } from './game.gateway';
import { AuthModule } from '../auth/auth.module';
import { MatchService } from './match.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Match, MatchSchema } from './schemas/match.schema';
import { TimerService } from './timer.service';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MatchController } from './match.controller';

@Module({
  imports: [
    RedisModule,
    UsersManagmentModule,
    AuthModule,
    MongooseModule.forFeature([{ name: Match.name, schema: MatchSchema }]),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot()
  ],
  controllers: [GameController, MatchController],
  providers: [GameService, ChessService, GameGateway, MatchService, TimerService],
})
export class ChessModule {}
