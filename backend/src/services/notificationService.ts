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
          tags: ['house', 'cloud_with_rain'],
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
          event: 'WEATHER_TASK_TRIGGERED',
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

const NOTIFY_COOLDOWN_MS = 12 * 60 * 60 * 1000; // Máximo 1 aviso cada 12 hs por la misma tarea

export async function runWeatherCheck(em: EntityManager): Promise<number> {
  const settings = await em.findOne(HouseSettings, { id: 1 });
  if (!settings || settings.latitude == null || settings.longitude == null) {
    return 0;
  }

  const forecast = await getWeatherForecast(settings);
  if (!forecast) return 0;

  const weatherTasks = await em.find(
    Task,
    { type: TaskType.WEATHER },
    { populate: ['assignedResidents', 'zone', 'lastCompletedBy'] }
  );

  const now = new Date();
  let notifiedCount = 0;

  for (const task of weatherTasks) {
    const dto = serializeTaskWithStatus(task, now, forecast);
    if (!dto.isDueToday) continue;

    const alreadyNotifiedRecently =
      task.lastWeatherNotifiedAt &&
      now.getTime() - task.lastWeatherNotifiedAt.getTime() < NOTIFY_COOLDOWN_MS;

    if (alreadyNotifiedRecently) continue;

    const title = `${task.icon} ${task.title}`;
    const body = `${dto.statusLabel}${task.description ? `\n${task.description}` : ''}`;

    const results = await sendExternalNotification(settings, title, body);
    if (results.some((r) => r.ok)) {
      task.lastWeatherNotifiedAt = now;
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
        console.log(`🌦️ Monitor climático: se enviaron ${notified} notificación(es) de tareas.`);
      }
    } catch (err: any) {
      console.error('⚠️ Error en monitor climático:', err.message || err);
    }
  };

  // Primer chequeo 15 segundos después de iniciar
  setTimeout(execute, 15_000);
  setInterval(execute, INTERVAL_MS);
}
