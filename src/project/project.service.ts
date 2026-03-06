import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectEntity } from './entities/project.entity';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: EntityRepository<ProjectEntity>,
  ) {}

  async create(createProjectDto: CreateProjectDto) {
    const now = new Date();
    const project = this.projectRepository.create({
      id: createProjectDto.id ?? randomUUID(),
      name: createProjectDto.name,
      description: createProjectDto.description,
      basePath: createProjectDto.basePath ?? '',
      techStack: createProjectDto.techStack ?? {},
      workflowJson: createProjectDto.workflowJson,
      createdAt: now,
      updatedAt: now,
    });
    await this.projectRepository.getEntityManager().persistAndFlush(project);
    return project;
  }

  async findAll() {
    return this.projectRepository.findAll({ orderBy: { updatedAt: 'desc' } });
  }

  async findOne(id: string) {
    const project = await this.projectRepository.findOne({ id });
    if (!project) {
      throw new NotFoundException('项目不存在');
    }
    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    const project = await this.findOne(id);
    this.projectRepository.assign(project, {
      name: updateProjectDto.name ?? project.name,
      description: updateProjectDto.description ?? project.description,
      basePath: updateProjectDto.basePath ?? project.basePath,
      techStack: updateProjectDto.techStack ?? project.techStack,
      workflowJson: updateProjectDto.workflowJson ?? project.workflowJson,
    });
    await this.projectRepository.getEntityManager().persistAndFlush(project);
    return project;
  }

  async remove(id: string) {
    const project = await this.findOne(id);
    await this.projectRepository.getEntityManager().removeAndFlush(project);
    return { id };
  }
}
