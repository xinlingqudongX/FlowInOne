import { PartialType } from '@nestjs/swagger';
import { CreateTaskNodeDto } from './create-task-node.dto';

export class UpdateTaskNodeDto extends PartialType(CreateTaskNodeDto) {}
