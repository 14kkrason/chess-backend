import { Module } from '@nestjs/common';
import { MatchCreatorService } from './match-creator.service';
import { MatchManagementController } from './match-management.controller';
import { MatchGetterService } from './match-getter.service';
import { MatchDeletterService } from './match-deletter.service';
import { MatchUpdaterService } from './match-updater.service';
import { MatchGateway } from './match.gateway';
import { EloService } from './elo.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Match, MatchSchema } from './schemas/match.schema';
import { UsersManagmentModule } from '../users-managment/users-managment.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Match.name, schema: MatchSchema }]),
    UsersManagmentModule,
    RedisModule
  ],
  providers: [
    MatchCreatorService,
    MatchGetterService,
    MatchDeletterService,
    MatchUpdaterService,
    MatchGateway,
    EloService,
  ],
  exports: [MatchCreatorService, MatchGateway],
  controllers: [MatchManagementController],
})
export class MatchModule {}
