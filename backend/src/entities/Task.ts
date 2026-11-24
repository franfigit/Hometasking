import {
  Entity,
  PrimaryKey,
  Property,
  Enum,
  ManyToOne,
  ManyToMany,
  Collection,
} from '@mikro-orm/core';
import { Zone } from './Zone';
import { Resident } from './Resident';

export enum TaskType {
  FIXED_SCHEDULE = 'FIXED_SCHEDULE', // Se repite en días específicos de la semana
  INTERVAL = 'INTERVAL',             // Se repite cada N días desde que se completó por última vez
  STOCK = 'STOCK',                   // Control por contador / umbral (ej. bidones de agua)
  ON_DEMAND = 'ON_DEMAND',           // Se activa manualmente cuando hace falta
  WEATHER = 'WEATHER',               // Se activa automáticamente según pronóstico del clima
}

export enum WeatherCondition {
  RAIN_FORECAST = 'RAIN_FORECAST',     // Lluvia / llovizna / chaparrón próximo
  STORM_FORECAST = 'STORM_FORECAST',   // Tormenta eléctrica o lluvia intensa
  HIGH_WIND = 'HIGH_WIND',             // Viento fuerte (>= umbral km/h)
  EXTREME_HEAT = 'EXTREME_HEAT',       // Calor extremo (>= umbral °C)
  FROST_OR_COLD = 'FROST_OR_COLD',     // Frío / helada (<= umbral °C)
}

export enum AssignmentType {
  ALL = 'ALL',       // Abierta a todos los residentes
  SINGLE = 'SINGLE', // Un único residente asignado
  GROUP = 'GROUP',   // Grupo selecto (cualquiera del grupo puede hacerla)
}

@Entity()
export class Task {
  @PrimaryKey()
  id!: number;

  @Property()
  title!: string;

  @Property({ nullable: true })
  description?: string;

  @Property({ default: '🧹' })
  icon: string = '🧹';

  @Property({ default: 2 })
  points: number = 2; // 1 a 5 puntos de esfuerzo

  @Enum(() => TaskType)
  type: TaskType = TaskType.FIXED_SCHEDULE;

  // Para FIXED_SCHEDULE: lista de días de la semana separados por coma ("0,1,2,3,4,5,6" donde 0 = Domingo, 1 = Lunes...)
  @Property({ nullable: true })
  daysOfWeek?: string;

  // Hora sugerida opcional (ej. "09:00" para "Revisar si hay ropa colgada a la mañana")
  @Property({ nullable: true })
  timeOfDay?: string;

  // Para INTERVAL: cada cuántos días se debe repetir desde lastCompletedAt (ej. 2 = día por medio)
  @Property({ nullable: true })
  intervalDays?: number;

  // Para STOCK ("Modo Bidón"):
  @Property({ nullable: true })
  currentStock?: number;

  @Property({ nullable: true })
  minThreshold?: number;

  @Property({ nullable: true })
  maxStock?: number;

  @Property({ nullable: true })
  unitName?: string; // ej. "bidones llenos"

  // Para WEATHER (tareas activadas por pronóstico climático):
  @Enum({ items: () => WeatherCondition, nullable: true })
  weatherCondition?: WeatherCondition;

  @Property({ nullable: true })
  weatherLeadHours?: number; // ej. 24 = avisar con 24h de anticipación

  @Property({ nullable: true })
  weatherMinProbability?: number; // ej. 50 (%) para lluvia

  @Property({ nullable: true })
  weatherThresholdValue?: number; // umbral en km/h (viento) o °C (calor/frío)

  @Property({ nullable: true })
  weatherCooldownDays?: number; // días de espera tras completar antes de volver a activarse

  @Property({ nullable: true })
  lastWeatherNotifiedAt?: Date; // evita re-enviar notificaciones externas repetidas

  // Estado manual (para ON_DEMAND o cuando un residente escanea QR y marca "Falta hacer")
  @Property({ default: false })
  isPendingManual: boolean = false;

  @Enum(() => AssignmentType)
  assignmentType: AssignmentType = AssignmentType.ALL;

  @ManyToMany(() => Resident, (resident) => resident.assignedTasks, { owner: true })
  assignedResidents = new Collection<Resident>(this);

  @ManyToOne(() => Zone, { nullable: true })
  zone?: Zone;

  @Property({ unique: true })
  qrCode!: string;

  @Property({ nullable: true })
  lastCompletedAt?: Date;

  @ManyToOne(() => Resident, { nullable: true })
  lastCompletedBy?: Resident;

  @Property()
  createdAt: Date = new Date();
}
