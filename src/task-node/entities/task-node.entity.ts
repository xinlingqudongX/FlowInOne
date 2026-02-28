import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  OneToMany,
  Collection,
} from '@mikro-orm/core';
import { WorkflowGraph } from '../../workflow-graph/entities/workflow-graph.entity';
import { TaskOutput } from './task-output.entity';

@Entity()
export class TaskNode {
  @PrimaryKey()
  id!: string;

  @Property()
  graphId!: string;

  @Property()
  nodeId!: string;

  @Property()
  type!: string;

  @Property({ default: 'PENDING' })
  status: string = 'PENDING';

  @Property({ type: 'json' })
  dependsOn!: string[];

  @Property({ type: 'json' })
  transitions!: Record<string, string>;

  @Property({ type: 'json' })
  instructions!: Record<string, string>;

  @Property({ type: 'array' })
  ragTags!: string[];

  @Property({ type: 'array' })
  staticRefs!: string[];

  @Property({ nullable: true })
  assetScope?: string;

  @Property({ type: 'json' })
  expectedArtifacts!: Record<string, any>;

  @Property({ type: 'text', nullable: true })
  aiOutput?: string;

  @Property({ type: 'text', nullable: true })
  errorLog?: string;

  @ManyToOne(() => WorkflowGraph)
  graph!: WorkflowGraph;

  @OneToMany(() => TaskOutput, (output) => output.task)
  outputs = new Collection<TaskOutput>(this);
}
