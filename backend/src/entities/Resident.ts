import { Entity, PrimaryKey, Property, Enum, Collection, ManyToMany } from '@mikro-orm/core';
import { Task } from './Task';

export enum ResidentRole {
  ADMIN = 'ADMIN',
  RESIDENT = 'RESIDENT',
}

@Entity()
export class Resident {
  @PrimaryKey()
  id!: number;

  @Property()
  name!: string;

  @Property({ default: '🧑' })
  avatar: string = '🧑';

  @Property({ default: '#4F46E5' })
  color: string = '#4F46E5';

  @Enum(() => ResidentRole)
  role: ResidentRole = ResidentRole.RESIDENT;

  @Property({ nullable: true })
  pin?: string;

  @Property({ default: true })
  active: boolean = true;

  @ManyToMany(() => Task, (task) => task.assignedResidents)
  assignedTasks = new Collection<Task>(this);

  @Property()
  createdAt: Date = new Date();
}
