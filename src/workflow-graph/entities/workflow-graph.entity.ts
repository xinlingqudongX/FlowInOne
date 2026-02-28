import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  OneToMany,
  Collection,
} from '@mikro-orm/core';
import { Project } from '../../project/entities/project.entity';
import { TaskNode } from '../../task-node/entities/task-node.entity';

@Entity()
export class WorkflowGraph {
  @PrimaryKey()
  id!: string;

  @Property()
  projectId!: string;

  @Property({ default: '1.0.0' })
  version: string = '1.0.0';

  @Property({ default: 'ACTIVE' })
  status: string = 'ACTIVE';

  @ManyToOne(() => Project)
  project!: Project;

  @OneToMany(() => TaskNode, (node) => node.graph)
  nodes = new Collection<TaskNode>(this);

  @Property({ type: 'json' })
  globalState!: Record<string, any>;
}
