import { Test, TestingModule } from '@nestjs/testing';
import { MatchDeletterService } from './match-deletter.service';

describe('MatchDeletterService', () => {
  let service: MatchDeletterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MatchDeletterService],
    }).compile();

    service = module.get<MatchDeletterService>(MatchDeletterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
