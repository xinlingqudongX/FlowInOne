import { Test, TestingModule } from '@nestjs/testing';
import { TaskNodeService } from './task-node.service';

describe('TaskNodeService', () => {
  let service: TaskNodeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TaskNodeService],
    }).compile();

    service = module.get<TaskNodeService>(TaskNodeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
