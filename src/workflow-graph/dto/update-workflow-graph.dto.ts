import { PartialType } from '@nestjs/swagger';
import { CreateWorkflowGraphDto } from './create-workflow-graph.dto';

export class UpdateWorkflowGraphDto extends PartialType(CreateWorkflowGraphDto) {}
