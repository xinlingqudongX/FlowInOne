import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { WorkflowGraphService } from './workflow-graph.service';
import { CreateWorkflowGraphDto } from './dto/create-workflow-graph.dto';
import { UpdateWorkflowGraphDto } from './dto/update-workflow-graph.dto';

@Controller('workflow-graph')
export class WorkflowGraphController {
  constructor(private readonly workflowGraphService: WorkflowGraphService) {}

  @Post()
  create(@Body() createWorkflowGraphDto: CreateWorkflowGraphDto) {
    return this.workflowGraphService.create(createWorkflowGraphDto);
  }

  @Get()
  findAll() {
    return this.workflowGraphService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workflowGraphService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateWorkflowGraphDto: UpdateWorkflowGraphDto) {
    return this.workflowGraphService.update(+id, updateWorkflowGraphDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.workflowGraphService.remove(+id);
  }
}
