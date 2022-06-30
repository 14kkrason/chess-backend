import { Module } from '@nestjs/common';
import { MatchCreatorService } from './match-creator.service';

@Module({
  providers: [MatchCreatorService],
  exports: [MatchCreatorService],
})
export class MatchModule {}
