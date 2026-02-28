import { Module } from '@nestjs/common';
import { TaskNodeService } from './task-node.service';
import { TaskNodeController } from './task-node.controller';

@Module({
  controllers: [TaskNodeController],
  providers: [TaskNodeService],
})
export class TaskNodeModule {}
