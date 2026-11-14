import { Task, TaskType, AssignmentType } from '../entities/Task';

export interface TaskStatusDTO {
  id: number;
  title: string;
  description?: string;
  icon: string;
  points: number;
  type: TaskType;
  daysOfWeek?: number[];
  timeOfDay?: string;
  intervalDays?: number;
  currentStock?: number;
  minThreshold?: number;
  maxStock?: number;
  unitName?: string;
  isPendingManual: boolean;
  assignmentType: AssignmentType;
  assignedResidents: {
    id: number;
    name: string;
    avatar: string;
    color: string;
  }[];
  zone?: {
    id: number;
    name: string;
    icon: string;
    qrCode: string;
  };
  qrCode: string;
  lastCompletedAt?: string;
  lastCompletedBy?: {
    id: number;
    name: string;
    avatar: string;
  };
  // Estado calculado en tiempo real
  isDueToday: boolean;
  isUrgent: boolean;
  completedToday: boolean;
  statusLabel: string;
  daysSinceLastCompleted?: number;
}

function isSameCalendarDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function diffCalendarDays(from: Date, to: Date): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((end.getTime() - start.getTime()) / msPerDay);
}

export function serializeTaskWithStatus(task: Task, now: Date = new Date()): TaskStatusDTO {
  const completedToday = task.lastCompletedAt
    ? isSameCalendarDay(task.lastCompletedAt, now)
    : false;

  const daysSince = task.lastCompletedAt
    ? diffCalendarDays(task.lastCompletedAt, now)
    : undefined;

  const parsedDays = task.daysOfWeek
    ? task.daysOfWeek
        .split(',')
        .map((d) => Number(d.trim()))
        .filter((n) => !Number.isNaN(n))
    : [];

  let isDueToday = false;
  let isUrgent = false;
  let statusLabel = 'Al día';

  if (task.type === TaskType.STOCK) {
    const current = task.currentStock ?? 0;
    const min = task.minThreshold ?? 1;
    if (current <= min || task.isPendingManual) {
      isDueToday = true;
      isUrgent = true;
      statusLabel =
        current <= 0
          ? `¡Sin stock! (0 ${task.unitName || 'unidades'})`
          : `Stock bajo: queda ${current} ${task.unitName || 'unidad(es)'}`;
    } else {
      isDueToday = false;
      statusLabel = `Stock OK (${current}/${task.maxStock ?? current} ${task.unitName || 'unid.'})`;
    }
  } else if (task.type === TaskType.FIXED_SCHEDULE) {
    const todayDay = now.getDay(); // 0 = Domingo ... 6 = Sábado
    const scheduledToday = parsedDays.length === 0 || parsedDays.includes(todayDay);

    if (task.isPendingManual) {
      isDueToday = true;
      isUrgent = true;
      statusLabel = 'Marcada como pendiente';
    } else if (completedToday) {
      isDueToday = false;
      statusLabel = 'Completada hoy';
    } else if (scheduledToday) {
      isDueToday = true;
      statusLabel = task.timeOfDay ? `Para hoy (${task.timeOfDay})` : 'Para hacer hoy';
    } else {
      isDueToday = false;
      statusLabel = 'No programada para hoy';
    }
  } else if (task.type === TaskType.INTERVAL) {
    const interval = task.intervalDays || 2;
    if (task.isPendingManual) {
      isDueToday = true;
      isUrgent = true;
      statusLabel = 'Marcada como pendiente';
    } else if (completedToday) {
      isDueToday = false;
      statusLabel = `Completada hoy (próxima en ${interval} días)`;
    } else if (daysSince === undefined) {
      isDueToday = true;
      statusLabel = `Pendiente (cada ${interval} días)`;
    } else if (daysSince >= interval) {
      isDueToday = true;
      isUrgent = daysSince > interval;
      statusLabel =
        daysSince > interval
          ? `Atrasada por ${daysSince - interval} día(s)`
          : `Toca hoy (hace ${daysSince} días)`;
    } else {
      isDueToday = false;
      const remaining = interval - daysSince;
      statusLabel = `En ${remaining} día(s)`;
    }
  } else if (task.type === TaskType.ON_DEMAND) {
    if (task.isPendingManual) {
      isDueToday = true;
      isUrgent = true;
      statusLabel = 'Solicitada / Pendiente';
    } else if (completedToday) {
      isDueToday = false;
      statusLabel = 'Realizada hoy';
    } else {
      isDueToday = false;
      statusLabel = 'A demanda (sin pedido activo)';
    }
  }

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    icon: task.icon,
    points: task.points,
    type: task.type,
    daysOfWeek: parsedDays,
    timeOfDay: task.timeOfDay,
    intervalDays: task.intervalDays,
    currentStock: task.currentStock,
    minThreshold: task.minThreshold,
    maxStock: task.maxStock,
    unitName: task.unitName,
    isPendingManual: task.isPendingManual,
    assignmentType: task.assignmentType,
    assignedResidents: task.assignedResidents.getItems().map((r) => ({
      id: r.id,
      name: r.name,
      avatar: r.avatar,
      color: r.color,
    })),
    zone: task.zone
      ? {
          id: task.zone.id,
          name: task.zone.name,
          icon: task.zone.icon,
          qrCode: task.zone.qrCode,
        }
      : undefined,
    qrCode: task.qrCode,
    lastCompletedAt: task.lastCompletedAt?.toISOString(),
    lastCompletedBy: task.lastCompletedBy
      ? {
          id: task.lastCompletedBy.id,
          name: task.lastCompletedBy.name,
          avatar: task.lastCompletedBy.avatar,
        }
      : undefined,
    isDueToday,
    isUrgent,
    completedToday,
    statusLabel,
    daysSinceLastCompleted: daysSince,
  };
}
