import { Test, TestingModule } from '@nestjs/testing';
import { MatchUpdaterService } from './match-updater.service';

describe('MatchUpdaterService', () => {
  let service: MatchUpdaterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MatchUpdaterService],
    }).compile();

    service = module.get<MatchUpdaterService>(MatchUpdaterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
