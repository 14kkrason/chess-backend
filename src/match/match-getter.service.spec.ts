import { Test, TestingModule } from '@nestjs/testing';
import { MatchGetterService } from './match-getter.service';

describe('MatchGetterService', () => {
  let service: MatchGetterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MatchGetterService],
    }).compile();

    service = module.get<MatchGetterService>(MatchGetterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
