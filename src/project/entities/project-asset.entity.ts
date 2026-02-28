import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { Project } from './project.entity';

@Entity()
export class ProjectAsset {
  @PrimaryKey()
  id!: string;

  @Property()
  projectId!: string;

  @Property()
  filePath!: string;

  @Property()
  fileRole!: string;

  @Property({ nullable: true })
  lastHash?: string;

  @ManyToOne(() => Project)
  project!: Project;
}
