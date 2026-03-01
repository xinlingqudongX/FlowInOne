import {
  Entity,
  PrimaryKey,
  Property,
  OneToMany,
  Collection,
} from '@mikro-orm/core';

@Entity()
export class ProjectEntity {
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
}
