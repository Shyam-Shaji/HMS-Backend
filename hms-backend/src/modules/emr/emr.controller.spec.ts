import { Test, TestingModule } from '@nestjs/testing';
import { EmrController } from './emr.controller';

describe('EmrController', () => {
  let controller: EmrController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmrController],
    }).compile();

    controller = module.get<EmrController>(EmrController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
