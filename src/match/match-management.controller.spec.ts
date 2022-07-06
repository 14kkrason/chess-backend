import { Test, TestingModule } from '@nestjs/testing';
import { MatchManagementController } from './match-management.controller';

describe('MatchManagementController', () => {
  let controller: MatchManagementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchManagementController],
    }).compile();

    controller = module.get<MatchManagementController>(MatchManagementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
