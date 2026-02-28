import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { TaskNode } from './task-node.entity';

@Entity()
export class TaskOutput {
  @PrimaryKey()
  id!: string;

  @Property()
  nodeId!: string;

  @Property()
  filePath!: string;

  @Property()
  actionType!: string;

  @Property({ type: 'text', nullable: true })
  diffSummary?: string;

  @ManyToOne(() => TaskNode)
  task!: TaskNode;
}
