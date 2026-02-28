import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TaskNodeService } from './task-node.service';
import { CreateTaskNodeDto } from './dto/create-task-node.dto';
import { UpdateTaskNodeDto } from './dto/update-task-node.dto';

@Controller('task-node')
export class TaskNodeController {
  constructor(private readonly taskNodeService: TaskNodeService) {}

  @Post()
  create(@Body() createTaskNodeDto: CreateTaskNodeDto) {
    return this.taskNodeService.create(createTaskNodeDto);
  }

  @Get()
  findAll() {
    return this.taskNodeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.taskNodeService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTaskNodeDto: UpdateTaskNodeDto) {
    return this.taskNodeService.update(+id, updateTaskNodeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.taskNodeService.remove(+id);
  }
}
