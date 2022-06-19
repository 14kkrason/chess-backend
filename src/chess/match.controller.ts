import { Controller, Get, Query } from '@nestjs/common';
import { UsersManagmentService } from 'src/users-managment/users-managment.service';
import { MatchService } from './match.service';

@Controller('match-management')
export class MatchController {
  constructor(private readonly matchService: MatchService, private readonly userManagmentService: UsersManagmentService) {}

  @Get('get-match-info')
  async getMatchInfo(@Query('username') username: string, @Query('page') page: string, @Query('pageSize') pageSize: string) {
    let skip = -(parseInt(page) * 10 + parseInt(pageSize));
    let limit = parseInt(pageSize);
    const userQuery = await this.userManagmentService.getGameIds(username, limit, skip);
    //const result = await this.matchService.getProfileGameInformation(gameIds!.games);
    const games = await this.matchService.getProfileGameInformation(userQuery!.games);
    const formatted = games.map((element) => {
      return { dateFormatted: new Date(element.date).toLocaleDateString(), ...element.toObject()};
    })
    return { games: formatted };
  }

  @Get('get-single-match')
  async getSingleMatch(@Query('id') id: string) {
    if(id) {
      return await this.matchService.getMatch(id);
    }
    return 'No id detected.'
  }
}
