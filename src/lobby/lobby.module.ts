import { Module } from '@nestjs/common';
import { LobbyController } from './lobby.controller';
import { LobbyCreatorService } from './lobby-creator.service';
import { LobbyDeleterService } from './lobby-deleter.service';
import { LobbySearchService } from './lobby-search.service';
import { RedisModule } from 'src/redis/redis.module';
import { AuthModule } from 'src/auth/auth.module';
import { UsersManagmentModule } from 'src/users-managment/users-managment.module';
import { MatchModule } from 'src/match/match.module';

@Module({
  imports: [AuthModule, RedisModule, UsersManagmentModule, MatchModule],
  controllers: [LobbyController],
  providers: [LobbyCreatorService, LobbyDeleterService, LobbySearchService],
})
export class LobbyModule {}
