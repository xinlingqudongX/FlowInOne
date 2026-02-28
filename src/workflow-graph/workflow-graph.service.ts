import { Injectable } from '@nestjs/common';
import { CreateWorkflowGraphDto } from './dto/create-workflow-graph.dto';
import { UpdateWorkflowGraphDto } from './dto/update-workflow-graph.dto';

@Injectable()
export class WorkflowGraphService {
  create(createWorkflowGraphDto: CreateWorkflowGraphDto) {
    return 'This action adds a new workflowGraph';
  }

  findAll() {
    return `This action returns all workflowGraph`;
  }

  findOne(id: number) {
    return `This action returns a #${id} workflowGraph`;
  }

  update(id: number, updateWorkflowGraphDto: UpdateWorkflowGraphDto) {
    return `This action updates a #${id} workflowGraph`;
  }

  remove(id: number) {
    return `This action removes a #${id} workflowGraph`;
  }
}
