import { EntityManager, MikroORM } from '@mikro-orm/core';
import { MySqlDriver } from '@mikro-orm/mysql';
import { HouseSettings } from '../entities/HouseSettings';
import { Task, TaskType } from '../entities/Task';
import { getWeatherForecast } from './weatherService';
import { serializeTaskWithStatus } from './taskStatus';

export interface NotificationResult {
  channel: 'ntfy' | 'telegram' | 'webhook';
  ok: boolean;
  error?: string;
}

export async function sendExternalNotification(
  settings: HouseSettings,
  title: string,
  message: string
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];

  if (settings.ntfyEnabled && settings.ntfyTopic?.trim()) {
    const base = (settings.ntfyServerUrl || 'https://ntfy.sh').replace(/\/+$/, '');
    const topic = settings.ntfyTopic.trim().replace(/^\/+/, '');
    try {
      const res = await fetch(base, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          title,
          message,
          priority: 4,
          tags: ['house', 'bell'],
        }),
      });
      if (!res.ok) {
        results.push({ channel: 'ntfy', ok: false, error: `HTTP ${res.status}` });
      } else {
        results.push({ channel: 'ntfy', ok: true });
      }
    } catch (err: any) {
      results.push({ channel: 'ntfy', ok: false, error: err.message });
    }
  }

  if (settings.telegramEnabled && settings.telegramBotToken?.trim() && settings.telegramChatId?.trim()) {
    try {
      const url = `https://api.telegram.org/bot${settings.telegramBotToken.trim()}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: settings.telegramChatId.trim(),
          text: `🏠 *${title}*\n${message}`,
          parse_mode: 'Markdown',
        }),
      });
      if (!res.ok) {
        results.push({ channel: 'telegram', ok: false, error: `HTTP ${res.status}` });
      } else {
        results.push({ channel: 'telegram', ok: true });
      }
    } catch (err: any) {
      results.push({ channel: 'telegram', ok: false, error: err.message });
    }
  }

  if (settings.webhookEnabled && settings.webhookUrl?.trim()) {
    try {
      const res = await fetch(settings.webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'TASK_NOTIFICATION',
          title,
          message,
          timestamp: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        results.push({ channel: 'webhook', ok: false, error: `HTTP ${res.status}` });
      } else {
        results.push({ channel: 'webhook', ok: true });
      }
    } catch (err: any) {
      results.push({ channel: 'webhook', ok: false, error: err.message });
    }
  }

  return results;
}

const NOTIFY_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hs para clima/stock/a demanda

function isSameCalendarDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isPastTimeOfDay(timeOfDay: string | undefined, now: Date): boolean {
  if (!timeOfDay) return true;
  const [hh, mm] = timeOfDay.split(':').map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return true;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= hh * 60 + mm;
}

export async function notifySingleTaskNow(
  em: EntityManager,
  task: Task,
  customMessage?: string
): Promise<boolean> {
  const settings = await em.findOne(HouseSettings, { id: 1 });
  if (!settings) return false;

  const dto = serializeTaskWithStatus(task, new Date(), null);
  const title = `${task.icon} ${task.title}`;
  const body = `${customMessage || dto.statusLabel}${task.description ? `\n${task.description}` : ''}`;

  const results = await sendExternalNotification(settings, title, body);
  if (results.some((r) => r.ok)) {
    task.lastNotifiedAt = new Date();
    return true;
  }
  return false;
}

export async function runWeatherCheck(em: EntityManager): Promise<number> {
  const settings = await em.findOne(HouseSettings, { id: 1 });
  if (!settings) return 0;

  let forecast = null;
  if (settings.latitude != null && settings.longitude != null) {
    try {
      forecast = await getWeatherForecast(settings);
    } catch (err: any) {
      console.warn('⚠️ Error obteniendo clima en monitor:', err.message || err);
    }
  }

  const allTasks = await em.find(
    Task,
    {},
    { populate: ['assignedResidents', 'zone', 'lastCompletedBy'] }
  );

  const now = new Date();
  let notifiedCount = 0;

  for (const task of allTasks) {
    const dto = serializeTaskWithStatus(task, now, forecast);
    if (!dto.isDueToday) continue;

    const lastNotified = task.lastNotifiedAt || task.lastWeatherNotifiedAt;

    if (task.type === TaskType.FIXED_SCHEDULE || task.type === TaskType.INTERVAL) {
      // Periódicas: máximo 1 aviso por día y respetando timeOfDay si está configurada
      if (lastNotified && isSameCalendarDay(lastNotified, now)) continue;
      if (task.type === TaskType.FIXED_SCHEDULE && !isPastTimeOfDay(task.timeOfDay, now)) {
        continue;
      }
    } else {
      // WEATHER, STOCK, ON_DEMAND: cooldown de 12 hs
      if (lastNotified && now.getTime() - lastNotified.getTime() < NOTIFY_COOLDOWN_MS) {
        continue;
      }
    }

    const title = `${task.icon} ${task.title}`;
    const body = `${dto.statusLabel}${task.description ? `\n${task.description}` : ''}`;

    const results = await sendExternalNotification(settings, title, body);
    if (results.some((r) => r.ok)) {
      task.lastNotifiedAt = now;
      if (task.type === TaskType.WEATHER) {
        task.lastWeatherNotifiedAt = now;
      }
      notifiedCount++;
    }
  }

  if (notifiedCount > 0) {
    await em.flush();
  }

  return notifiedCount;
}

export function startWeatherMonitor(orm: MikroORM<MySqlDriver>): void {
  const INTERVAL_MS = 30 * 60 * 1000; // Cada 30 minutos

  const execute = async () => {
    try {
      const notified = await runWeatherCheck(orm.em.fork());
      if (notified > 0) {
        console.log(`🔔 Monitor de tareas: se enviaron ${notified} notificación(es).`);
      }
    } catch (err: any) {
      console.error('⚠️ Error en monitor de tareas:', err.message || err);
    }
  };

  // Primer chequeo 15 segundos después de iniciar
  setTimeout(execute, 15_000);
  setInterval(execute, INTERVAL_MS);
}
