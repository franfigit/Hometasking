import { HouseSettings } from '../entities/HouseSettings';
import { Task, WeatherCondition } from '../entities/Task';

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

export interface WeatherCurrent {
  temperature: number;
  apparentTemperature: number;
  precipitation: number;
  windSpeed: number;
  weatherCode: number;
  description: string;
  icon: string;
  isDay: boolean;
  time: string;
}

export interface WeatherHourlyPoint {
  time: string;
  temperature: number;
  precipitationProbability: number;
  precipitation: number;
  weatherCode: number;
  windSpeed: number;
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
  current: WeatherCurrent;
  hourly: WeatherHourlyPoint[];
  daily: WeatherDailyPoint[];
}

export interface WeatherEvaluation {
  triggered: boolean;
  summary: string;
  triggerTime?: string;
}

const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
const STORM_CODES = new Set([65, 67, 82, 95, 96, 99]);

export function describeWeatherCode(code: number, isDay = true): { description: string; icon: string } {
  if (code === 0) return { description: 'Despejado', icon: isDay ? '☀️' : '🌙' };
  if (code === 1) return { description: 'Mayormente despejado', icon: isDay ? '🌤️' : '🌙' };
  if (code === 2) return { description: 'Parcialmente nublado', icon: '⛅' };
  if (code === 3) return { description: 'Nublado', icon: '☁️' };
  if (code === 45 || code === 48) return { description: 'Niebla', icon: '🌫️' };
  if (code >= 51 && code <= 57) return { description: 'Llovizna', icon: '🌦️' };
  if (code >= 61 && code <= 67) return { description: 'Lluvia', icon: '🌧️' };
  if (code >= 71 && code <= 77) return { description: 'Nieve', icon: '❄️' };
  if (code >= 80 && code <= 82) return { description: 'Chaparrones', icon: '🌧️' };
  if (code === 85 || code === 86) return { description: 'Nieve intensa', icon: '❄️' };
  if (code >= 95) return { description: 'Tormenta eléctrica', icon: '⛈️' };
  return { description: 'Variable', icon: '🌡️' };
}

interface CacheEntry {
  key: string;
  expiresAt: number;
  data: WeatherForecast;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos
let forecastCache: CacheEntry | null = null;

export function invalidateWeatherCache(): void {
  forecastCache = null;
}

export async function searchCities(query: string): Promise<CitySearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    trimmed
  )}&count=6&language=es&format=json`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Error al buscar ciudades (HTTP ${res.status})`);
  }
  const data = (await res.json()) as { results?: any[] };
  if (!Array.isArray(data.results)) return [];

  return data.results.map((item) => {
    const parts = [item.name, item.admin1, item.country].filter(Boolean);
    return {
      id: item.id,
      name: item.name,
      admin1: item.admin1,
      country: item.country || '',
      latitude: item.latitude,
      longitude: item.longitude,
      timezone: item.timezone || 'auto',
      label: parts.join(', '),
    };
  });
}

export async function getWeatherForecast(
  settings: HouseSettings | null,
  forceRefresh = false
): Promise<WeatherForecast | null> {
  if (!settings || settings.latitude == null || settings.longitude == null) {
    return null;
  }

  const cacheKey = `${settings.latitude.toFixed(4)},${settings.longitude.toFixed(4)}`;
  if (!forceRefresh && forecastCache && forecastCache.key === cacheKey && Date.now() < forecastCache.expiresAt) {
    return forecastCache.data;
  }

  const tz = settings.timezone || 'auto';
  const params = new URLSearchParams({
    latitude: String(settings.latitude),
    longitude: String(settings.longitude),
    timezone: tz,
    forecast_days: '5',
    current: 'temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day',
    hourly: 'temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m',
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max',
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Error consultando Open-Meteo (HTTP ${res.status})`);
  }

  const raw = (await res.json()) as any;
  const cur = raw.current || {};
  const isDay = cur.is_day !== 0;
  const curDesc = describeWeatherCode(Number(cur.weather_code ?? 0), isDay);

  const hourly: WeatherHourlyPoint[] = (raw.hourly?.time || []).map((t: string, i: number) => ({
    time: t,
    temperature: Number(raw.hourly.temperature_2m?.[i] ?? 0),
    precipitationProbability: Number(raw.hourly.precipitation_probability?.[i] ?? 0),
    precipitation: Number(raw.hourly.precipitation?.[i] ?? 0),
    weatherCode: Number(raw.hourly.weather_code?.[i] ?? 0),
    windSpeed: Number(raw.hourly.wind_speed_10m?.[i] ?? 0),
  }));

  const daily: WeatherDailyPoint[] = (raw.daily?.time || []).map((d: string, i: number) => {
    const code = Number(raw.daily.weather_code?.[i] ?? 0);
    const desc = describeWeatherCode(code, true);
    return {
      date: d,
      weatherCode: code,
      description: desc.description,
      icon: desc.icon,
      tempMax: Number(raw.daily.temperature_2m_max?.[i] ?? 0),
      tempMin: Number(raw.daily.temperature_2m_min?.[i] ?? 0),
      precipitationProbabilityMax: Number(raw.daily.precipitation_probability_max?.[i] ?? 0),
      precipitationSum: Number(raw.daily.precipitation_sum?.[i] ?? 0),
      windSpeedMax: Number(raw.daily.wind_speed_10m_max?.[i] ?? 0),
    };
  });

  const forecast: WeatherForecast = {
    locationName: settings.locationName || `${settings.latitude.toFixed(2)}, ${settings.longitude.toFixed(2)}`,
    latitude: settings.latitude,
    longitude: settings.longitude,
    timezone: raw.timezone || tz,
    fetchedAt: new Date().toISOString(),
    current: {
      temperature: Number(cur.temperature_2m ?? 0),
      apparentTemperature: Number(cur.apparent_temperature ?? cur.temperature_2m ?? 0),
      precipitation: Number(cur.precipitation ?? 0),
      windSpeed: Number(cur.wind_speed_10m ?? 0),
      weatherCode: Number(cur.weather_code ?? 0),
      description: curDesc.description,
      icon: curDesc.icon,
      isDay,
      time: cur.time || new Date().toISOString(),
    },
    hourly,
    daily,
  };

  forecastCache = {
    key: cacheKey,
    expiresAt: Date.now() + CACHE_TTL_MS,
    data: forecast,
  };

  return forecast;
}

function formatHoursAhead(hoursAhead: number): string {
  if (hoursAhead <= 1) return 'en la próxima hora';
  if (hoursAhead < 24) return `en ~${Math.round(hoursAhead)} hs`;
  const days = Math.round(hoursAhead / 24);
  return days === 1 ? 'mañana' : `en ~${days} días`;
}

export function evaluateWeatherCondition(
  task: Task,
  forecast: WeatherForecast | null,
  now: Date = new Date()
): WeatherEvaluation {
  if (!forecast) {
    return { triggered: false, summary: 'Configurá la ubicación en Hogar para activar' };
  }

  const condition = task.weatherCondition || WeatherCondition.RAIN_FORECAST;
  const leadHours = task.weatherLeadHours ?? 24;
  const minProb = task.weatherMinProbability ?? 50;

  const nowMs = now.getTime();
  const windowEndMs = nowMs + leadHours * 60 * 60 * 1000;

  // Filtramos puntos horarios dentro de la ventana [ahora - 1h, ahora + leadHours]
  const windowPoints = forecast.hourly.filter((p) => {
    const t = new Date(p.time).getTime();
    return t >= nowMs - 60 * 60 * 1000 && t <= windowEndMs;
  });

  if (condition === WeatherCondition.RAIN_FORECAST) {
    const match = windowPoints.find(
      (p) =>
        (p.precipitationProbability >= minProb && (p.precipitation > 0 || RAIN_CODES.has(p.weatherCode))) ||
        p.precipitation >= 0.5
    );
    if (match) {
      const hoursAhead = Math.max(0, (new Date(match.time).getTime() - nowMs) / 3600000);
      return {
        triggered: true,
        summary: `🌧️ Lluvia pronosticada ${formatHoursAhead(hoursAhead)} (${match.precipitationProbability}%)`,
        triggerTime: match.time,
      };
    }
    return { triggered: false, summary: `Sin lluvia en las próximas ${leadHours} hs` };
  }

  if (condition === WeatherCondition.STORM_FORECAST) {
    const match = windowPoints.find(
      (p) => STORM_CODES.has(p.weatherCode) || p.precipitation >= 5
    );
    if (match) {
      const hoursAhead = Math.max(0, (new Date(match.time).getTime() - nowMs) / 3600000);
      return {
        triggered: true,
        summary: `⛈️ Tormenta / lluvia fuerte ${formatHoursAhead(hoursAhead)}`,
        triggerTime: match.time,
      };
    }
    return { triggered: false, summary: `Sin tormentas en las próximas ${leadHours} hs` };
  }

  if (condition === WeatherCondition.HIGH_WIND) {
    const threshold = task.weatherThresholdValue ?? 40;
    const match = windowPoints.find((p) => p.windSpeed >= threshold);
    if (match) {
      const hoursAhead = Math.max(0, (new Date(match.time).getTime() - nowMs) / 3600000);
      return {
        triggered: true,
        summary: `💨 Viento fuerte (${Math.round(match.windSpeed)} km/h) ${formatHoursAhead(hoursAhead)}`,
        triggerTime: match.time,
      };
    }
    return { triggered: false, summary: `Viento bajo (<${threshold} km/h)` };
  }

  if (condition === WeatherCondition.EXTREME_HEAT) {
    const threshold = task.weatherThresholdValue ?? 33;
    const match = windowPoints.find((p) => p.temperature >= threshold);
    if (match) {
      const hoursAhead = Math.max(0, (new Date(match.time).getTime() - nowMs) / 3600000);
      return {
        triggered: true,
        summary: `🔥 Calor extremo (${Math.round(match.temperature)}°C) ${formatHoursAhead(hoursAhead)}`,
        triggerTime: match.time,
      };
    }
    return { triggered: false, summary: `Temperatura normal (<${threshold}°C)` };
  }

  if (condition === WeatherCondition.FROST_OR_COLD) {
    const threshold = task.weatherThresholdValue ?? 5;
    const match = windowPoints.find((p) => p.temperature <= threshold);
    if (match) {
      const hoursAhead = Math.max(0, (new Date(match.time).getTime() - nowMs) / 3600000);
      return {
        triggered: true,
        summary: `❄️ Frío intenso (${Math.round(match.temperature)}°C) ${formatHoursAhead(hoursAhead)}`,
        triggerTime: match.time,
      };
    }
    return { triggered: false, summary: `Sin frío extremo (>${threshold}°C)` };
  }

  return { triggered: false, summary: 'Sin alerta climática próxima' };
}
