import { Entity, PrimaryKey, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { Task } from './Task';
import { Resident } from './Resident';

export enum TaskLogAction {
  COMPLETED = 'COMPLETED',             // Tarea completada (suma puntos)
  FLAGGED_PENDING = 'FLAGGED_PENDING', // Reportada como pendiente / falta hacer
  STOCK_CONSUMED = 'STOCK_CONSUMED',   // Se restó stock (ej. se vació un bidón)
  STOCK_REFILLED = 'STOCK_REFILLED',   // Se recargó stock (completa la tarea de reposición y suma puntos)
}

@Entity()
export class TaskLog {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => Task, { deleteRule: 'cascade' })
  task!: Task;

  @ManyToOne(() => Resident)
  resident!: Resident;

  @Enum(() => TaskLogAction)
  action!: TaskLogAction;

  @Property({ default: 0 })
  pointsEarned: number = 0;

  @Property({ nullable: true })
  previousStock?: number;

  @Property({ nullable: true })
  newStock?: number;

  @Property({ nullable: true })
  previousLastCompletedAt?: Date;

  @Property({ default: false })
  undone: boolean = false;

  @Property()
  createdAt: Date = new Date();
}
