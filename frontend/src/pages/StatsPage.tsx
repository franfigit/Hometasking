import React, { useEffect, useState } from 'react';
import { Trophy, RotateCcw, History } from 'lucide-react';
import { StatsResponse, api } from '../api/client';

export const StatsPage: React.FC = () => {
  const [days, setDays] = useState<number>(7);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async (d: number) => {
    try {
      setLoading(true);
      const data = await api.getStats(d);
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats(days);
  }, [days]);

  const handleUndo = async (logId: number) => {
    try {
      await api.undoLog(logId);
      await loadStats(days);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading || !stats) {
    return (
      <div className="py-12 text-center text-slate-500">Cargando estadísticas...</div>
    );
  }

  const maxPoints = Math.max(
    1,
    ...stats.leaderboard.map((item) => item.totalPoints)
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Balance de Esfuerzo y Ranking
          </h2>
          <p className="text-sm text-slate-500">
            Puntos acumulados según la complejidad de las tareas completadas por cada residente.
          </p>
        </div>

        <div className="inline-flex p-1 rounded-xl bg-slate-200/70 self-start sm:self-auto">
          {[
            { d: 7, label: 'Últimos 7 días' },
            { d: 30, label: 'Últimos 30 días' },
          ].map((opt) => (
            <button
              key={opt.d}
              onClick={() => setDays(opt.d)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${
                days === opt.d
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ranking de Residentes */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          Tabla de Colaboración ({days} días)
        </h3>

        <div className="space-y-4">
          {stats.leaderboard.map((entry, idx) => {
            const pct = Math.round((entry.totalPoints / maxPoints) * 100);
            return (
              <div key={entry.resident.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 text-center font-black text-slate-400">
                      #{idx + 1}
                    </span>
                    <span className="text-2xl">{entry.resident.avatar}</span>
                    <span className="font-bold text-slate-900">
                      {entry.resident.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-indigo-600 text-base">
                      {entry.totalPoints} pts
                    </span>
                    <span className="text-xs text-slate-400 ml-2">
                      ({entry.completedCount} tareas)
                    </span>
                  </div>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${ entry.totalPoints > 0 ? Math.max(8, pct) : 0 }%`,
                      backgroundColor: entry.resident.color || '#4F46E5',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Historial de Actividad */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-600" />
          Historial Reciente de Acciones
        </h3>

        {stats.recentLogs.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            Todavía no hay acciones registradas.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {stats.recentLogs.map((log) => (
              <div
                key={log.id}
                className={`py-3.5 flex items-center justify-between gap-3 ${
                  log.undone ? 'opacity-40 line-through' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{log.task.icon}</span>
                  <div>
                    <div className="text-sm text-slate-900">
                      <span className="font-semibold">
                        {log.resident.avatar} {log.resident.name}
                      </span>{' '}
                      {log.action === 'COMPLETED' && 'completó'}
                      {log.action === 'STOCK_REFILLED' && 'recargó stock de'}
                      {log.action === 'STOCK_CONSUMED' && 'descontó 1 unidad de'}
                      {log.action === 'FLAGGED_PENDING' && 'marcó como pendiente'}{' '}
                      <span className="font-bold">"{log.task.title}"</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(log.createdAt).toLocaleString('es-AR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                      {log.pointsEarned > 0 && (
                        <span className="ml-2 text-indigo-600 font-semibold">
                          +{log.pointsEarned} pts
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!log.undone && (
                  <button
                    onClick={() => handleUndo(log.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-600 shrink-0"
                  >
                    <RotateCcw className="w-3 h-3" /> Deshacer
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
