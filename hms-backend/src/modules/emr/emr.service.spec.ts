import { Test, TestingModule } from '@nestjs/testing';
import { EmrService } from './emr.service';

describe('EmrService', () => {
  let service: EmrService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmrService],
    }).compile();

    service = module.get<EmrService>(EmrService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
