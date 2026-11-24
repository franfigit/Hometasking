import { Router } from 'express';
import { RequestContext } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/mysql';
import { Resident, ResidentRole } from '../entities/Resident';
import { Zone } from '../entities/Zone';
import { Task, TaskType, AssignmentType } from '../entities/Task';
import { TaskLog, TaskLogAction } from '../entities/TaskLog';
import { HouseSettings } from '../entities/HouseSettings';
import { serializeTaskWithStatus } from '../services/taskStatus';
import {
  WeatherForecast,
  getWeatherForecast,
  invalidateWeatherCache,
  searchCities,
} from '../services/weatherService';
import {
  notifySingleTaskNow,
  runWeatherCheck,
  sendExternalNotification,
} from '../services/notificationService';

const router = Router();

function getEm(): EntityManager {
  const em = RequestContext.getEntityManager() as EntityManager | undefined;
  if (!em) {
    throw new Error('EntityManager not found in RequestContext');
  }
  return em;
}

async function getOrCreateSettings(em: EntityManager): Promise<HouseSettings> {
  let settings = await em.findOne(HouseSettings, { id: 1 });
  if (!settings) {
    settings = em.create(HouseSettings, {
      id: 1,
      ntfyEnabled: false,
      ntfyServerUrl: 'https://ntfy.sh',
      telegramEnabled: false,
      webhookEnabled: false,
      updatedAt: new Date(),
    });
    await em.persistAndFlush(settings);
  }
  return settings;
}

async function safeGetForecast(em: EntityManager, forceRefresh = false): Promise<WeatherForecast | null> {
  try {
    const settings = await em.findOne(HouseSettings, { id: 1 });
    return await getWeatherForecast(settings, forceRefresh);
  } catch (err: any) {
    console.warn('⚠️ No se pudo obtener el pronóstico del clima:', err.message || err);
    return null;
  }
}

function generateCode(prefix: string, name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 16);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${slug}-${rand}`;
}

// ==========================================
// RESIDENTES
// ==========================================

router.get('/residents', async (_req, res) => {
  try {
    const em = getEm();
    const residents = await em.find(Resident, {}, { orderBy: { id: 'ASC' } });
    res.json(
      residents.map((r) => ({
        id: r.id,
        name: r.name,
        avatar: r.avatar,
        color: r.color,
        role: r.role,
        active: r.active,
        hasPin: Boolean(r.pin && r.pin.trim().length > 0),
      }))
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/residents/:id/verify-pin', async (req, res) => {
  try {
    const em = getEm();
    const resident = await em.findOne(Resident, { id: Number(req.params.id) });
    if (!resident) {
      return res.status(404).json({ error: 'Residente no encontrado' });
    }
    if (!resident.pin || resident.pin === req.body.pin) {
      return res.json({ valid: true });
    }
    return res.status(401).json({ valid: false, error: 'PIN incorrecto' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/residents', async (req, res) => {
  try {
    const em = getEm();
    const { name, avatar, color, role, pin } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }
    const resident = em.create(Resident, {
      name,
      avatar: avatar || '🧑',
      color: color || '#4F46E5',
      role: role === ResidentRole.ADMIN ? ResidentRole.ADMIN : ResidentRole.RESIDENT,
      pin: pin ? String(pin).trim() : undefined,
      active: true,
      createdAt: new Date(),
    });
    await em.persistAndFlush(resident);
    res.status(201).json(resident);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/residents/:id', async (req, res) => {
  try {
    const em = getEm();
    const resident = await em.findOne(Resident, { id: Number(req.params.id) });
    if (!resident) {
      return res.status(404).json({ error: 'Residente no encontrado' });
    }
    const { name, avatar, color, role, pin, active } = req.body;
    if (name !== undefined) resident.name = name;
    if (avatar !== undefined) resident.avatar = avatar;
    if (color !== undefined) resident.color = color;
    if (role !== undefined) resident.role = role;
    if (pin !== undefined) resident.pin = pin === '' ? undefined : String(pin).trim();
    if (active !== undefined) resident.active = Boolean(active);

    await em.flush();
    res.json(resident);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/residents/:id', async (req, res) => {
  try {
    const em = getEm();
    const resident = await em.findOne(Resident, { id: Number(req.params.id) });
    if (!resident) {
      return res.status(404).json({ error: 'Residente no encontrado' });
    }
    await em.removeAndFlush(resident);
    res.json({ deleted: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// SECTORES / PUESTOS (ZONES)
// ==========================================

router.get('/zones', async (_req, res) => {
  try {
    const em = getEm();
    const zones = await em.find(Zone, {}, { populate: ['tasks'], orderBy: { id: 'ASC' } });
    res.json(
      zones.map((z) => ({
        id: z.id,
        name: z.name,
        icon: z.icon,
        qrCode: z.qrCode,
        description: z.description,
        taskCount: z.tasks.length,
      }))
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/zones', async (req, res) => {
  try {
    const em = getEm();
    const { name, icon, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'El nombre del sector es obligatorio' });
    }
    const zone = em.create(Zone, {
      name,
      icon: icon || '📍',
      description,
      qrCode: generateCode('ZONE', name),
      createdAt: new Date(),
    });
    await em.persistAndFlush(zone);
    res.status(201).json(zone);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/zones/:id', async (req, res) => {
  try {
    const em = getEm();
    const zone = await em.findOne(Zone, { id: Number(req.params.id) });
    if (!zone) {
      return res.status(404).json({ error: 'Sector no encontrado' });
    }
    await em.removeAndFlush(zone);
    res.json({ deleted: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// TAREAS (TASKS)
// ==========================================

router.get('/tasks', async (_req, res) => {
  try {
    const em = getEm();
    const [tasks, forecast] = await Promise.all([
      em.find(
        Task,
        {},
        {
          populate: ['assignedResidents', 'zone', 'lastCompletedBy'],
          orderBy: { id: 'ASC' },
        }
      ),
      safeGetForecast(em),
    ]);
    const now = new Date();
    res.json(tasks.map((t) => serializeTaskWithStatus(t, now, forecast)));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/tasks', async (req, res) => {
  try {
    const em = getEm();
    const {
      title,
      description,
      icon,
      points,
      type,
      daysOfWeek,
      timeOfDay,
      intervalDays,
      currentStock,
      minThreshold,
      maxStock,
      unitName,
      weatherCondition,
      weatherLeadHours,
      weatherMinProbability,
      weatherThresholdValue,
      weatherCooldownDays,
      assignmentType,
      assignedResidentIds,
      zoneId,
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'El título de la tarea es obligatorio' });
    }

    const task = em.create(Task, {
      title,
      description,
      icon: icon || '🧹',
      points: Number(points) || 2,
      type: type || TaskType.FIXED_SCHEDULE,
      daysOfWeek: Array.isArray(daysOfWeek) ? daysOfWeek.join(',') : daysOfWeek,
      timeOfDay,
      intervalDays: intervalDays !== undefined ? Number(intervalDays) : undefined,
      currentStock: currentStock !== undefined ? Number(currentStock) : undefined,
      minThreshold: minThreshold !== undefined ? Number(minThreshold) : undefined,
      maxStock: maxStock !== undefined ? Number(maxStock) : undefined,
      unitName,
      weatherCondition: type === TaskType.WEATHER ? weatherCondition : undefined,
      weatherLeadHours:
        type === TaskType.WEATHER && weatherLeadHours !== undefined
          ? Number(weatherLeadHours)
          : undefined,
      weatherMinProbability:
        type === TaskType.WEATHER && weatherMinProbability !== undefined
          ? Number(weatherMinProbability)
          : undefined,
      weatherThresholdValue:
        type === TaskType.WEATHER && weatherThresholdValue !== undefined && weatherThresholdValue !== ''
          ? Number(weatherThresholdValue)
          : undefined,
      weatherCooldownDays:
        type === TaskType.WEATHER && weatherCooldownDays !== undefined
          ? Number(weatherCooldownDays)
          : undefined,
      isPendingManual: type === TaskType.ON_DEMAND ? true : false,
      assignmentType: assignmentType || AssignmentType.ALL,
      qrCode: generateCode('TASK', title),
      createdAt: new Date(),
    });

    if (zoneId) {
      const zone = await em.findOne(Zone, { id: Number(zoneId) });
      if (zone) task.zone = zone;
    }

    if (Array.isArray(assignedResidentIds) && assignedResidentIds.length > 0) {
      const residents = await em.find(Resident, { id: { $in: assignedResidentIds.map(Number) } });
      task.assignedResidents.set(residents);
    }

    await em.persistAndFlush(task);
    await em.populate(task, ['assignedResidents', 'zone', 'lastCompletedBy']);
    const forecast = task.type === TaskType.WEATHER ? await safeGetForecast(em) : null;
    res.status(201).json(serializeTaskWithStatus(task, new Date(), forecast));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/tasks/:id', async (req, res) => {
  try {
    const em = getEm();
    const task = await em.findOne(
      Task,
      { id: Number(req.params.id) },
      { populate: ['assignedResidents', 'zone', 'lastCompletedBy'] }
    );
    if (!task) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    const {
      title,
      description,
      icon,
      points,
      type,
      daysOfWeek,
      timeOfDay,
      intervalDays,
      currentStock,
      minThreshold,
      maxStock,
      unitName,
      weatherCondition,
      weatherLeadHours,
      weatherMinProbability,
      weatherThresholdValue,
      weatherCooldownDays,
      assignmentType,
      assignedResidentIds,
      zoneId,
    } = req.body;

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (icon !== undefined) task.icon = icon;
    if (points !== undefined) task.points = Number(points);
    if (type !== undefined) task.type = type;
    if (daysOfWeek !== undefined) {
      task.daysOfWeek = Array.isArray(daysOfWeek) ? daysOfWeek.join(',') : daysOfWeek;
    }
    if (timeOfDay !== undefined) task.timeOfDay = timeOfDay;
    if (intervalDays !== undefined) task.intervalDays = Number(intervalDays);
    if (currentStock !== undefined) task.currentStock = Number(currentStock);
    if (minThreshold !== undefined) task.minThreshold = Number(minThreshold);
    if (maxStock !== undefined) task.maxStock = Number(maxStock);
    if (unitName !== undefined) task.unitName = unitName;
    if (weatherCondition !== undefined) task.weatherCondition = weatherCondition;
    if (weatherLeadHours !== undefined) task.weatherLeadHours = Number(weatherLeadHours);
    if (weatherMinProbability !== undefined) task.weatherMinProbability = Number(weatherMinProbability);
    if (weatherThresholdValue !== undefined) {
      task.weatherThresholdValue =
        weatherThresholdValue === '' || weatherThresholdValue === null
          ? undefined
          : Number(weatherThresholdValue);
    }
    if (weatherCooldownDays !== undefined) task.weatherCooldownDays = Number(weatherCooldownDays);
    if (assignmentType !== undefined) task.assignmentType = assignmentType;

    if (zoneId !== undefined) {
      if (!zoneId) {
        task.zone = undefined;
      } else {
        const zone = await em.findOne(Zone, { id: Number(zoneId) });
        task.zone = zone || undefined;
      }
    }

    if (Array.isArray(assignedResidentIds)) {
      const residents = await em.find(Resident, { id: { $in: assignedResidentIds.map(Number) } });
      task.assignedResidents.set(residents);
    }

    await em.flush();
    const forecast = task.type === TaskType.WEATHER ? await safeGetForecast(em) : null;
    res.json(serializeTaskWithStatus(task, new Date(), forecast));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/tasks/:id', async (req, res) => {
  try {
    const em = getEm();
    const task = await em.findOne(Task, { id: Number(req.params.id) });
    if (!task) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    await em.removeAndFlush(task);
    res.json({ deleted: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ACCIONES SOBRE TAREAS (Completar, Pendiente, Stock, Deshacer)
// ==========================================

router.post('/tasks/:id/complete', async (req, res) => {
  try {
    const em = getEm();
    const { residentId } = req.body;
    const task = await em.findOne(
      Task,
      { id: Number(req.params.id) },
      { populate: ['assignedResidents', 'zone', 'lastCompletedBy'] }
    );
    if (!task) return res.status(404).json({ error: 'Tarea no encontrada' });

    const resident = await em.findOne(Resident, { id: Number(residentId) });
    if (!resident) return res.status(400).json({ error: 'Selecciona qué residente eres primero' });

    const previousLastCompletedAt = task.lastCompletedAt;
    const previousStock = task.currentStock;

    task.lastCompletedAt = new Date();
    task.lastCompletedBy = resident;
    task.isPendingManual = false;
    task.lastNotifiedAt = undefined;

    let action = TaskLogAction.COMPLETED;
    if (task.type === TaskType.STOCK) {
      action = TaskLogAction.STOCK_REFILLED;
      task.currentStock = task.maxStock ?? 4;
    }

    const log = em.create(TaskLog, {
      task,
      resident,
      action,
      pointsEarned: task.points,
      previousStock,
      newStock: task.currentStock,
      previousLastCompletedAt,
      undone: false,
      createdAt: new Date(),
    });

    await em.persistAndFlush(log);
    res.json({
      task: serializeTaskWithStatus(task),
      logId: log.id,
      pointsEarned: log.pointsEarned,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/tasks/:id/flag-pending', async (req, res) => {
  try {
    const em = getEm();
    const { residentId } = req.body;
    const task = await em.findOne(
      Task,
      { id: Number(req.params.id) },
      { populate: ['assignedResidents', 'zone', 'lastCompletedBy'] }
    );
    if (!task) return res.status(404).json({ error: 'Tarea no encontrada' });

    const resident = await em.findOne(Resident, { id: Number(residentId) });
    if (!resident) return res.status(400).json({ error: 'Selecciona qué residente eres primero' });

    task.isPendingManual = true;

    const log = em.create(TaskLog, {
      task,
      resident,
      action: TaskLogAction.FLAGGED_PENDING,
      pointsEarned: 0,
      undone: false,
      createdAt: new Date(),
    });

    await notifySingleTaskNow(em, task, `Marcada como pendiente por ${resident.name}`);
    await em.persistAndFlush(log);
    res.json({
      task: serializeTaskWithStatus(task),
      logId: log.id,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/tasks/:id/stock', async (req, res) => {
  try {
    const em = getEm();
    const { residentId, delta, refillAll } = req.body;
    const task = await em.findOne(
      Task,
      { id: Number(req.params.id) },
      { populate: ['assignedResidents', 'zone', 'lastCompletedBy'] }
    );
    if (!task) return res.status(404).json({ error: 'Tarea no encontrada' });

    const resident = await em.findOne(Resident, { id: Number(residentId) });
    if (!resident) return res.status(400).json({ error: 'Selecciona qué residente eres primero' });

    const previousStock = task.currentStock ?? 0;
    const previousLastCompletedAt = task.lastCompletedAt;

    let newStock = previousStock;
    let action = TaskLogAction.STOCK_CONSUMED;
    let pointsEarned = 0;

    if (refillAll) {
      newStock = task.maxStock ?? Math.max(previousStock + 1, 4);
      action = TaskLogAction.STOCK_REFILLED;
      pointsEarned = task.points;
      task.lastCompletedAt = new Date();
      task.lastCompletedBy = resident;
      task.isPendingManual = false;
    } else {
      const change = Number(delta) || -1;
      newStock = Math.max(0, previousStock + change);
      if (change > 0) {
        action = TaskLogAction.STOCK_REFILLED;
        pointsEarned = task.points;
        task.lastCompletedAt = new Date();
        task.lastCompletedBy = resident;
        task.isPendingManual = false;
      }
    }

    task.currentStock = newStock;

    const minThreshold = task.minThreshold ?? 1;
    if (previousStock > minThreshold && newStock <= minThreshold) {
      await notifySingleTaskNow(em, task);
    }

    const log = em.create(TaskLog, {
      task,
      resident,
      action,
      pointsEarned,
      previousStock,
      newStock,
      previousLastCompletedAt,
      undone: false,
      createdAt: new Date(),
    });

    await em.persistAndFlush(log);
    res.json({
      task: serializeTaskWithStatus(task),
      logId: log.id,
      pointsEarned,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logs/:id/undo', async (req, res) => {
  try {
    const em = getEm();
    const log = await em.findOne(
      TaskLog,
      { id: Number(req.params.id) },
      { populate: ['task', 'task.assignedResidents', 'task.zone', 'task.lastCompletedBy'] }
    );
    if (!log) return res.status(404).json({ error: 'Registro no encontrado' });
    if (log.undone) return res.status(400).json({ error: 'Esta acción ya fue deshecha' });

    const task = log.task;
    log.undone = true;

    if (log.action === TaskLogAction.COMPLETED) {
      task.lastCompletedAt = log.previousLastCompletedAt;
    } else if (log.action === TaskLogAction.FLAGGED_PENDING) {
      task.isPendingManual = false;
    } else if (
      log.action === TaskLogAction.STOCK_CONSUMED ||
      log.action === TaskLogAction.STOCK_REFILLED
    ) {
      if (log.previousStock !== undefined) {
        task.currentStock = log.previousStock;
      }
      if (log.action === TaskLogAction.STOCK_REFILLED) {
        task.lastCompletedAt = log.previousLastCompletedAt;
      }
    }

    await em.flush();
    res.json({
      undone: true,
      task: serializeTaskWithStatus(task),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// RESOLUCIÓN DE CÓDIGOS QR (Tarea o Sector)
// ==========================================

router.get('/qr/:code', async (req, res) => {
  try {
    const em = getEm();
    const code = req.params.code;

    // 1. Buscar si corresponde a una tarea puntual
    const task = await em.findOne(
      Task,
      { qrCode: code },
      { populate: ['assignedResidents', 'zone', 'lastCompletedBy'] }
    );
    if (task) {
      return res.json({
        qrType: 'TASK',
        task: serializeTaskWithStatus(task),
      });
    }

    // 2. Buscar si corresponde a un sector / puesto
    const zone = await em.findOne(
      Zone,
      { qrCode: code },
      {
        populate: [
          'tasks',
          'tasks.assignedResidents',
          'tasks.zone',
          'tasks.lastCompletedBy',
        ],
      }
    );
    if (zone) {
      return res.json({
        qrType: 'ZONE',
        zone: {
          id: zone.id,
          name: zone.name,
          icon: zone.icon,
          qrCode: zone.qrCode,
          description: zone.description,
        },
        tasks: zone.tasks.getItems().map((t) => serializeTaskWithStatus(t)),
      });
    }

    return res.status(404).json({ error: 'Código QR no encontrado en el sistema' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ESTADÍSTICAS, RANKING E HISTORIAL
// ==========================================

router.get('/stats', async (req, res) => {
  try {
    const em = getEm();
    const days = Number(req.query.days) || 7;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const residents = await em.find(Resident, {}, { orderBy: { id: 'ASC' } });
    const logs = await em.find(
      TaskLog,
      {
        createdAt: { $gte: since },
        undone: false,
      },
      {
        populate: ['resident', 'task'],
        orderBy: { createdAt: 'DESC' },
      }
    );

    const leaderboard = residents
      .map((r) => {
        const residentLogs = logs.filter((l) => l.resident.id === r.id);
        const completedCount = residentLogs.filter(
          (l) =>
            l.action === TaskLogAction.COMPLETED || l.action === TaskLogAction.STOCK_REFILLED
        ).length;
        const totalPoints = residentLogs.reduce((acc, l) => acc + l.pointsEarned, 0);

        return {
          resident: {
            id: r.id,
            name: r.name,
            avatar: r.avatar,
            color: r.color,
            role: r.role,
          },
          completedCount,
          totalPoints,
        };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints || b.completedCount - a.completedCount);

    const recentLogs = await em.find(
      TaskLog,
      {},
      {
        populate: ['resident', 'task'],
        orderBy: { createdAt: 'DESC' },
        limit: 40,
      }
    );

    res.json({
      periodDays: days,
      leaderboard,
      recentLogs: recentLogs.map((l) => ({
        id: l.id,
        action: l.action,
        pointsEarned: l.pointsEarned,
        previousStock: l.previousStock,
        newStock: l.newStock,
        undone: l.undone,
        createdAt: l.createdAt.toISOString(),
        resident: {
          id: l.resident.id,
          name: l.resident.name,
          avatar: l.resident.avatar,
          color: l.resident.color,
        },
        task: {
          id: l.task.id,
          title: l.task.title,
          icon: l.task.icon,
        },
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// CLIMA Y CONFIGURACIÓN DEL HOGAR
// ==========================================

router.get('/weather/search', async (req, res) => {
  try {
    const q = String(req.query.q || '');
    const results = await searchCities(q);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/weather', async (req, res) => {
  try {
    const em = getEm();
    const settings = await getOrCreateSettings(em);
    if (settings.latitude == null || settings.longitude == null) {
      return res.json({ configured: false, forecast: null });
    }
    const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';
    const forecast = await getWeatherForecast(settings, forceRefresh);
    res.json({ configured: true, forecast });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/weather/check-now', async (_req, res) => {
  try {
    const em = getEm();
    invalidateWeatherCache();
    const notified = await runWeatherCheck(em);
    res.json({ ok: true, notified });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/settings', async (_req, res) => {
  try {
    const em = getEm();
    const s = await getOrCreateSettings(em);
    res.json({
      locationName: s.locationName || '',
      latitude: s.latitude ?? null,
      longitude: s.longitude ?? null,
      timezone: s.timezone || 'auto',
      ntfyEnabled: s.ntfyEnabled,
      ntfyServerUrl: s.ntfyServerUrl || 'https://ntfy.sh',
      ntfyTopic: s.ntfyTopic || '',
      telegramEnabled: s.telegramEnabled,
      hasTelegramToken: Boolean(s.telegramBotToken),
      telegramChatId: s.telegramChatId || '',
      webhookEnabled: s.webhookEnabled,
      webhookUrl: s.webhookUrl || '',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const em = getEm();
    const s = await getOrCreateSettings(em);
    const {
      locationName,
      latitude,
      longitude,
      timezone,
      ntfyEnabled,
      ntfyServerUrl,
      ntfyTopic,
      telegramEnabled,
      telegramBotToken,
      telegramChatId,
      webhookEnabled,
      webhookUrl,
    } = req.body;

    if (locationName !== undefined) s.locationName = locationName || undefined;
    if (latitude !== undefined) s.latitude = latitude === null ? undefined : Number(latitude);
    if (longitude !== undefined) s.longitude = longitude === null ? undefined : Number(longitude);
    if (timezone !== undefined) s.timezone = timezone || undefined;

    if (ntfyEnabled !== undefined) s.ntfyEnabled = Boolean(ntfyEnabled);
    if (ntfyServerUrl !== undefined) s.ntfyServerUrl = String(ntfyServerUrl || 'https://ntfy.sh').trim();
    if (ntfyTopic !== undefined) s.ntfyTopic = ntfyTopic ? String(ntfyTopic).trim() : undefined;

    if (telegramEnabled !== undefined) s.telegramEnabled = Boolean(telegramEnabled);
    if (telegramBotToken !== undefined && telegramBotToken !== '') {
      s.telegramBotToken = telegramBotToken === 'CLEAR' ? undefined : String(telegramBotToken).trim();
    }
    if (telegramChatId !== undefined) s.telegramChatId = telegramChatId ? String(telegramChatId).trim() : undefined;

    if (webhookEnabled !== undefined) s.webhookEnabled = Boolean(webhookEnabled);
    if (webhookUrl !== undefined) s.webhookUrl = webhookUrl ? String(webhookUrl).trim() : undefined;

    s.updatedAt = new Date();
    await em.flush();
    invalidateWeatherCache();

    res.json({
      locationName: s.locationName || '',
      latitude: s.latitude ?? null,
      longitude: s.longitude ?? null,
      timezone: s.timezone || 'auto',
      ntfyEnabled: s.ntfyEnabled,
      ntfyServerUrl: s.ntfyServerUrl || 'https://ntfy.sh',
      ntfyTopic: s.ntfyTopic || '',
      telegramEnabled: s.telegramEnabled,
      hasTelegramToken: Boolean(s.telegramBotToken),
      telegramChatId: s.telegramChatId || '',
      webhookEnabled: s.webhookEnabled,
      webhookUrl: s.webhookUrl || '',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/settings/test-notification', async (_req, res) => {
  try {
    const em = getEm();
    const s = await getOrCreateSettings(em);
    const results = await sendExternalNotification(
      s,
      'Prueba de Hometasking 🌦️',
      'Si estás leyendo esto, las notificaciones climáticas están configuradas correctamente.'
    );
    if (results.length === 0) {
      return res.status(400).json({
        error: 'No hay ningún canal de notificación habilitado y completo (ntfy, Telegram o Webhook).',
      });
    }
    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
