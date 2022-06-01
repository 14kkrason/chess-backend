import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { UsersManagmentModule } from 'src/users-managment/users-managment.module';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';

@Module({
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
  imports: [
    UsersManagmentModule,
    AuthModule
  ]
})
export class LeaderboardModule {}
