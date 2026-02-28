import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowGraphController } from './workflow-graph.controller';
import { WorkflowGraphService } from './workflow-graph.service';

describe('WorkflowGraphController', () => {
  let controller: WorkflowGraphController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkflowGraphController],
      providers: [WorkflowGraphService],
    }).compile();

    controller = module.get<WorkflowGraphController>(WorkflowGraphController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
