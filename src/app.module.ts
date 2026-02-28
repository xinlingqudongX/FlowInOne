import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProjectModule } from './project/project.module';
import { WorkflowGraphModule } from './workflow-graph/workflow-graph.module';
import { TaskNodeModule } from './task-node/task-node.module';

@Module({
  imports: [ProjectModule, WorkflowGraphModule, TaskNodeModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
