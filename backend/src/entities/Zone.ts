import { Entity, PrimaryKey, Property, OneToMany, Collection } from '@mikro-orm/core';
import { Task } from './Task';

@Entity()
export class Zone {
  @PrimaryKey()
  id!: number;

  @Property()
  name!: string;

  @Property({ default: '📍' })
  icon: string = '📍';

  @Property({ unique: true })
  qrCode!: string;

  @Property({ nullable: true })
  description?: string;

  @OneToMany(() => Task, (task) => task.zone)
  tasks = new Collection<Task>(this);

  @Property()
  createdAt: Date = new Date();
}
