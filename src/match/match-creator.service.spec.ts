import { Test, TestingModule } from '@nestjs/testing';
import { MatchCreatorService } from './match-creator.service';

describe('MatchCreatorService', () => {
  let service: MatchCreatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MatchCreatorService],
    }).compile();

    service = module.get<MatchCreatorService>(MatchCreatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
