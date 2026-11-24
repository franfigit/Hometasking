export type ResidentRole = 'ADMIN' | 'RESIDENT';

export interface Resident {
  id: number;
  name: string;
  avatar: string;
  color: string;
  role: ResidentRole;
  active: boolean;
  hasPin?: boolean;
}

export type TaskType = 'FIXED_SCHEDULE' | 'INTERVAL' | 'STOCK' | 'ON_DEMAND' | 'WEATHER';
export type WeatherCondition =
  | 'RAIN_FORECAST'
  | 'STORM_FORECAST'
  | 'HIGH_WIND'
  | 'EXTREME_HEAT'
  | 'FROST_OR_COLD';
export type AssignmentType = 'ALL' | 'SINGLE' | 'GROUP';

export interface Zone {
  id: number;
  name: string;
  icon: string;
  qrCode: string;
  description?: string;
  taskCount?: number;
}

export interface TaskItem {
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
  weatherCondition?: WeatherCondition;
  weatherLeadHours?: number;
  weatherMinProbability?: number;
  weatherThresholdValue?: number;
  weatherCooldownDays?: number;
  weatherTriggerReason?: string;
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
  isDueToday: boolean;
  isUrgent: boolean;
  completedToday: boolean;
  statusLabel: string;
  daysSinceLastCompleted?: number;
}

export interface StatsResponse {
  periodDays: number;
  leaderboard: {
    resident: {
      id: number;
      name: string;
      avatar: string;
      color: string;
      role: ResidentRole;
    };
    completedCount: number;
    totalPoints: number;
  }[];
  recentLogs: {
    id: number;
    action: 'COMPLETED' | 'FLAGGED_PENDING' | 'STOCK_CONSUMED' | 'STOCK_REFILLED';
    pointsEarned: number;
    previousStock?: number;
    newStock?: number;
    undone: boolean;
    createdAt: string;
    resident: {
      id: number;
      name: string;
      avatar: string;
      color: string;
    };
    task: {
      id: number;
      title: string;
      icon: string;
    };
  }[];
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Error en la comunicación con el servidor');
  }
  return data as T;
}

export const api = {
  getResidents: () => request<Resident[]>('/residents'),
  verifyPin: (residentId: number, pin: string) =>
    request<{ valid: boolean }>(`/residents/${residentId}/verify-pin`, {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }),
  createResident: (payload: Partial<Resident> & { pin?: string }) =>
    request<Resident>('/residents', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateResident: (id: number, payload: Partial<Resident> & { pin?: string }) =>
    request<Resident>(`/residents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteResident: (id: number) =>
    request<{ deleted: boolean }>(`/residents/${id}`, { method: 'DELETE' }),

  getZones: () => request<Zone[]>('/zones'),
  createZone: (payload: Partial<Zone>) =>
    request<Zone>('/zones', { method: 'POST', body: JSON.stringify(payload) }),
  deleteZone: (id: number) =>
    request<{ deleted: boolean }>(`/zones/${id}`, { method: 'DELETE' }),

  getTasks: () => request<TaskItem[]>('/tasks'),
  createTask: (payload: any) =>
    request<TaskItem>('/tasks', { method: 'POST', body: JSON.stringify(payload) }),
  updateTask: (id: number, payload: any) =>
    request<TaskItem>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteTask: (id: number) =>
    request<{ deleted: boolean }>(`/tasks/${id}`, { method: 'DELETE' }),

  completeTask: (taskId: number, residentId: number) =>
    request<{ task: TaskItem; logId: number; pointsEarned: number }>(
      `/tasks/${taskId}/complete`,
      {
        method: 'POST',
        body: JSON.stringify({ residentId }),
      }
    ),
  flagTaskPending: (taskId: number, residentId: number) =>
    request<{ task: TaskItem; logId: number }>(`/tasks/${taskId}/flag-pending`, {
      method: 'POST',
      body: JSON.stringify({ residentId }),
    }),
  updateTaskStock: (
    taskId: number,
    residentId: number,
    options: { delta?: number; refillAll?: boolean }
  ) =>
    request<{ task: TaskItem; logId: number; pointsEarned: number }>(
      `/tasks/${taskId}/stock`,
      {
        method: 'POST',
        body: JSON.stringify({ residentId, ...options }),
      }
    ),
  undoLog: (logId: number) =>
    request<{ undone: boolean; task: TaskItem }>(`/logs/${logId}/undo`, {
      method: 'POST',
    }),

  resolveQr: (code: string) =>
    request<
      | { qrType: 'TASK'; task: TaskItem }
      | { qrType: 'ZONE'; zone: Zone; tasks: TaskItem[] }
    >(`/qr/${encodeURIComponent(code)}`),

  getStats: (days: number = 7) => request<StatsResponse>(`/stats?days=${days}`),

  getWeather: (refresh = false) =>
    request<WeatherResponse>(`/weather${refresh ? '?refresh=1' : ''}`),
  searchCities: (q: string) =>
    request<CitySearchResult[]>(`/weather/search?q=${encodeURIComponent(q)}`),
  getSettings: () => request<HouseSettings>('/settings'),
  updateSettings: (payload: Partial<HouseSettings> & { telegramBotToken?: string }) =>
    request<HouseSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  testNotification: () =>
    request<{ results: { channel: string; ok: boolean; error?: string }[] }>(
      '/settings/test-notification',
      { method: 'POST' }
    ),
};

export interface CitySearchResult {
  id: number;
  name: string;
  admin1?: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  label: string;
}

export interface WeatherDailyPoint {
  date: string;
  weatherCode: number;
  description: string;
  icon: string;
  tempMax: number;
  tempMin: number;
  precipitationProbabilityMax: number;
  precipitationSum: number;
  windSpeedMax: number;
}

export interface WeatherForecast {
  locationName: string;
  latitude: number;
  longitude: number;
  timezone: string;
  fetchedAt: string;
  current: {
    temperature: number;
    apparentTemperature: number;
    precipitation: number;
    windSpeed: number;
    weatherCode: number;
    description: string;
    icon: string;
    isDay: boolean;
    time: string;
  };
  daily: WeatherDailyPoint[];
}

export interface WeatherResponse {
  configured: boolean;
  forecast: WeatherForecast | null;
}

export interface HouseSettings {
  locationName: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  ntfyEnabled: boolean;
  ntfyServerUrl: string;
  ntfyTopic: string;
  telegramEnabled: boolean;
  hasTelegramToken: boolean;
  telegramChatId: string;
  webhookEnabled: boolean;
  webhookUrl: string;
}
