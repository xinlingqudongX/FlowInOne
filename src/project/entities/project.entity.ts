import {
  Entity,
  PrimaryKey,
  Property,
  OneToMany,
  Collection,
} from '@mikro-orm/core';
import { WorkflowGraph } from '../../workflow-graph/entities/workflow-graph.entity';

@Entity()
export class Project {
  @PrimaryKey()
  id!: string;

  @Property({ unique: true })
  name!: string;

  @Property({ nullable: true })
  description?: string;

  @Property()
  basePath!: string;

  @Property({ type: 'json' })
  techStack!: Record<string, any>;

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @OneToMany(() => WorkflowGraph, (graph) => graph.project)
  graphs = new Collection<WorkflowGraph>(this);
}
