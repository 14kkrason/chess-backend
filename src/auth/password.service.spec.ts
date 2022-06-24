import { Test, TestingModule } from '@nestjs/testing';
import { PasswordService } from './password.service';
// import * as crypto from 'crypto';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should be a string', async () => {
    const pass = await service.generatePassword();
    expect(typeof pass).toBe('string');
  });

  it('should be between 28 and 40', async () => {
    const pass = await service.generatePassword();
    expect(pass.length).toBeGreaterThanOrEqual(28);
    expect(pass.length).toBeLessThanOrEqual(40);
  });
});
