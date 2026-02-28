import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowGraphService } from './workflow-graph.service';

describe('WorkflowGraphService', () => {
  let service: WorkflowGraphService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkflowGraphService],
    }).compile();

    service = module.get<WorkflowGraphService>(WorkflowGraphService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
