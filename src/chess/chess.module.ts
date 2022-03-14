import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { RedisModule } from 'src/redis/redis.module';
import { ChessService } from './chess.service';
import { UsersManagmentModule } from 'src/users-managment/users-managment.module';
import { GameGateway } from './game.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [RedisModule, UsersManagmentModule, AuthModule],
  controllers: [GameController],
  providers: [GameService, ChessService, GameGateway],
})
export class ChessModule {}
