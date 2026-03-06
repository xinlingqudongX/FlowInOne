import { createZodDto } from 'nestjs-zod';
import { createProjectSchema } from './create-project.dto';

export const updateProjectSchema = createProjectSchema.partial();

export class UpdateProjectDto extends createZodDto(updateProjectSchema) {}
