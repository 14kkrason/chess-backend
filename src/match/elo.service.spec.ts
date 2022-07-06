import { Test, TestingModule } from '@nestjs/testing';
import { EloService } from './elo.service';

describe('EloService', () => {
  let service: EloService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EloService],
    }).compile();

    service = module.get<EloService>(EloService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
