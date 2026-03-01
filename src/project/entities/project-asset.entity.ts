import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { ProjectEntity } from './project.entity';

@Entity()
export class ProjectAsset {
  @PrimaryKey()
  id!: string;

  @Property()
  filePath!: string;

  @Property()
  fileRole!: string;

  @Property({ nullable: true })
  lastHash?: string;

  @ManyToOne(() => ProjectEntity)
  project!: ProjectEntity;
}