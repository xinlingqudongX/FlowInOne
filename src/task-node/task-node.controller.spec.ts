import { Test, TestingModule } from '@nestjs/testing';
import { TaskNodeController } from './task-node.controller';
import { TaskNodeService } from './task-node.service';

describe('TaskNodeController', () => {
  let controller: TaskNodeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskNodeController],
      providers: [TaskNodeService],
    }).compile();

    controller = module.get<TaskNodeController>(TaskNodeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
