import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { UsersManagmentService } from 'src/users-managment/users-managment.service';
import { leaderboardQuery } from './interfaces/leaderboard-query.interface';
import { LeaderboardUserQuery } from './interfaces/leaderboard-user-query.interface';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly userManagmentService: UsersManagmentService) {}

  // get top 10 players
  @UseGuards(JwtAuthGuard)
  @Get('records')
  async getLeaderboardRecords(@Query() leaderboardQuery: leaderboardQuery) {
    let skip = 0;
    let limit = 10;
    let formats = ['bullet', 'blitz', 'rapid'];

    if (leaderboardQuery.skip) {
      skip = leaderboardQuery.skip!;
    }

    if (leaderboardQuery.limit && limit < 1000) {
      limit = leaderboardQuery.limit!;
    }

    if (leaderboardQuery.formats) {
      formats = leaderboardQuery.formats!.split(',');
    }

    const data = await this.userManagmentService.getSortedByElo(
      skip,
      limit,
      formats,
    );
    return { ...data };
  }

  @UseGuards(JwtAuthGuard)
  @Get('user')
  async getSearchedUser(@Query() leaderboardUserQuery: LeaderboardUserQuery) {
    if (leaderboardUserQuery.username) {
      const searchResults =
        await this.userManagmentService.getUserSearchResults(
          leaderboardUserQuery.username,
        );
      return { results: searchResults };
    }
    return { message: 'No username query' };
  }
}
