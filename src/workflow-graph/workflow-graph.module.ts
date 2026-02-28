import { Module } from '@nestjs/common';
import { WorkflowGraphService } from './workflow-graph.service';
import { WorkflowGraphController } from './workflow-graph.controller';

@Module({
  controllers: [WorkflowGraphController],
  providers: [WorkflowGraphService],
})
export class WorkflowGraphModule {}
