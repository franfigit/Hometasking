import React from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, MapPin, Wind, Droplets, Bell, BellRing } from 'lucide-react';
import { WeatherResponse, TaskItem } from '../api/client';

interface WeatherWidgetProps {
  weather: WeatherResponse | null;
  triggeredWeatherTasks: TaskItem[];
  onRefresh: () => void;
  refreshing: boolean;
  notifPermission: NotificationPermission | 'unsupported';
  onEnableNotif: () => void;
}

function formatDayLabel(dateStr: string, index: number): string {
  if (index === 0) return 'Hoy';
  if (index === 1) return 'Mañana';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('es-AR', { weekday: 'short' });
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  weather,
  triggeredWeatherTasks,
  onRefresh,
  refreshing,
  notifPermission,
  onEnableNotif,
}) => {
  if (!weather) return null;

  if (!weather.configured || !weather.forecast) {
    return (
      <div className="bg-sky-50 border border-sky-200 rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-100 flex items-center justify-center text-xl shrink-0">
            🌦️
          </div>
          <div>
            <h3 className="text-sm font-bold text-sky-950">Clima no configurado</h3>
            <p className="text-xs text-sky-700">
              Elegí tu ciudad para ver el pronóstico y activar tareas automáticas (ej. limpiar canaletas antes de lluvia).
            </p>
          </div>
        </div>
        <Link
          to="/residents"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors shrink-0"
        >
          <MapPin className="w-3.5 h-3.5" /> Configurar ubicación
        </Link>
      </div>
    );
  }

  const { forecast } = weather;
  const { current, daily } = forecast;

  return (
    <div className="bg-gradient-to-br from-sky-50 via-white to-indigo-50 border border-sky-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Clima actual */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white border border-sky-100 shadow-sm flex items-center justify-center text-3xl shrink-0">
            {current.icon}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl font-extrabold text-slate-900">
                {Math.round(current.temperature)}°C
              </span>
              <span className="text-sm font-semibold text-slate-700">{current.description}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
              <span className="inline-flex items-center gap-1 font-medium text-sky-700">
                <MapPin className="w-3 h-3" /> {forecast.locationName}
              </span>
              <span className="inline-flex items-center gap-1">
                <Wind className="w-3 h-3" /> {Math.round(current.windSpeed)} km/h
              </span>
              {daily[0] && (
                <span className="inline-flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-sky-500" /> Prob. lluvia hoy: {daily[0].precipitationProbabilityMax}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Pronóstico próximos 3 días + acciones */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="hidden md:flex items-center gap-2 mr-1">
            {daily.slice(0, 3).map((d, idx) => (
              <div
                key={d.date}
                className="px-2.5 py-1.5 rounded-xl bg-white/80 border border-slate-200/70 text-center min-w-[68px]"
              >
                <div className="text-[10px] font-semibold text-slate-500 uppercase">
                  {formatDayLabel(d.date, idx)}
                </div>
                <div className="text-base leading-tight my-0.5">{d.icon}</div>
                <div className="text-[11px] font-bold text-slate-800">
                  {Math.round(d.tempMax)}° <span className="font-normal text-slate-400">{Math.round(d.tempMin)}°</span>
                </div>
                {d.precipitationProbabilityMax >= 30 && (
                  <div className="text-[10px] font-semibold text-sky-600">
                    💧{d.precipitationProbabilityMax}%
                  </div>
                )}
              </div>
            ))}
          </div>

          {notifPermission !== 'unsupported' && (
            <button
              onClick={onEnableNotif}
              title={
                notifPermission === 'granted'
                  ? 'Notificaciones del navegador activas'
                  : 'Activar notificaciones del navegador'
              }
              className={`p-2 rounded-xl border text-xs font-medium transition-colors ${
                notifPermission === 'granted'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {notifPermission === 'granted' ? (
                <BellRing className="w-4 h-4" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
            </button>
          )}

          <button
            onClick={onRefresh}
            disabled={refreshing}
            title="Actualizar clima"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Banner de alerta si hay tareas climáticas disparadas */}
      {triggeredWeatherTasks.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 text-xs text-amber-900">
          <span className="text-base shrink-0">⚠️</span>
          <div>
            <span className="font-bold">Alerta climática activa:</span>{' '}
            {triggeredWeatherTasks.map((t) => `${t.icon} ${t.title}`).join(' · ')}
          </div>
        </div>
      )}
    </div>
  );
};
