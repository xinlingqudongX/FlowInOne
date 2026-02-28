import { Injectable } from '@nestjs/common';
import { CreateTaskNodeDto } from './dto/create-task-node.dto';
import { UpdateTaskNodeDto } from './dto/update-task-node.dto';

@Injectable()
export class TaskNodeService {
  create(createTaskNodeDto: CreateTaskNodeDto) {
    return 'This action adds a new taskNode';
  }

  findAll() {
    return `This action returns all taskNode`;
  }

  findOne(id: number) {
    return `This action returns a #${id} taskNode`;
  }

  update(id: number, updateTaskNodeDto: UpdateTaskNodeDto) {
    return `This action updates a #${id} taskNode`;
  }

  remove(id: number) {
    return `This action removes a #${id} taskNode`;
  }
}
