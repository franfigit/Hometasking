import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RotateCcw,
  Minus,
  Plus,
  QrCode,
  Clock,
  Users,
} from 'lucide-react';
import { TaskItem, api } from '../api/client';
import { useProfile } from '../context/ProfileContext';

export const DashboardPage: React.FC = () => {
  const { currentResident } = useProfile();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'MINE' | 'ALL'>('MINE');
  const [lastUndo, setLastUndo] = useState<{
    logId: number;
    message: string;
  } | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<number | null>(null);

  const loadTasks = async () => {
    try {
      const data = await api.getTasks();
      setTasks(data);
    } catch (err) {
      console.error('Error al cargar tareas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const isAssignedToMe = (task: TaskItem) => {
    if (!currentResident) return true;
    if (task.assignmentType === 'ALL') return true;
    return task.assignedResidents.some((r) => r.id === currentResident.id);
  };

  const filteredTasks = tasks.filter((t) => (filter === 'MINE' ? isAssignedToMe(t) : true));

  const urgentAndStockTasks = filteredTasks.filter((t) => t.type === 'STOCK' || t.isUrgent);
  const dueTodayTasks = filteredTasks.filter(
    (t) => t.isDueToday && t.type !== 'STOCK' && !t.isUrgent
  );
  const upToDateTasks = filteredTasks.filter((t) => !t.isDueToday && t.type !== 'STOCK');

  const handleComplete = async (task: TaskItem) => {
    if (!currentResident) return;
    try {
      setBusyTaskId(task.id);
      const res = await api.completeTask(task.id, currentResident.id);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? res.task : t)));
      setLastUndo({
        logId: res.logId,
        message: `¡Completaste "${task.title}" (+${res.pointsEarned} pts)!`,
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusyTaskId(null);
    }
  };

  const handleStock = async (
    task: TaskItem,
    options: { delta?: number; refillAll?: boolean }
  ) => {
    if (!currentResident) return;
    try {
      setBusyTaskId(task.id);
      const res = await api.updateTaskStock(task.id, currentResident.id, options);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? res.task : t)));
      setLastUndo({
        logId: res.logId,
        message: options.refillAll
          ? `¡Recargaste "${task.title}" (+${res.pointsEarned} pts)!`
          : `Stock actualizado en "${task.title}"`,
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusyTaskId(null);
    }
  };

  const handleFlagPending = async (task: TaskItem) => {
    if (!currentResident) return;
    try {
      setBusyTaskId(task.id);
      const res = await api.flagTaskPending(task.id, currentResident.id);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? res.task : t)));
      setLastUndo({
        logId: res.logId,
        message: `Activaste "${task.title}" como pendiente.`,
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusyTaskId(null);
    }
  };

  const handleUndo = async () => {
    if (!lastUndo) return;
    try {
      await api.undoLog(lastUndo.logId);
      setLastUndo(null);
      await loadTasks();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-500">Cargando tareas del hogar...</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner de Deshacer */}
      {lastUndo && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 text-white shadow-lg">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{lastUndo.message}</span>
          </div>
          <button
            onClick={handleUndo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-semibold transition-colors shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Deshacer
          </button>
        </div>
      )}

      {/* Cabecera y Filtro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            ¡Hola, {currentResident?.name}! 👋
          </h2>
          <p className="text-sm text-slate-500">
            {dueTodayTasks.length + urgentAndStockTasks.filter((t) => t.isDueToday).length ===
            0
              ? 'Todo el hogar está al día por hoy.'
              : `Hay ${
                  dueTodayTasks.length +
                  urgentAndStockTasks.filter((t) => t.isDueToday).length
                } tarea(s) que requieren atención hoy.`}
          </p>
        </div>

        <div className="inline-flex p-1 rounded-xl bg-slate-100 self-start sm:self-auto">
          <button
            onClick={() => setFilter('MINE')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'MINE'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mis Tareas ({tasks.filter(isAssignedToMe).length})
          </button>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'ALL'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todo el Hogar ({tasks.length})
          </button>
        </div>
      </div>

      {/* Sección 1: Control de Stock (Modo Bidón) y Alertas Urgentes */}
      {urgentAndStockTasks.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 px-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Stock e Insumos / Urgentes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {urgentAndStockTasks.map((task) => {
              const isStock = task.type === 'STOCK';
              const isLow = isStock && (task.currentStock ?? 0) <= (task.minThreshold ?? 1);
              return (
                <div
                  key={task.id}
                  className={`p-5 rounded-3xl border transition-all shadow-sm ${
                    task.isUrgent || isLow
                      ? 'bg-amber-50/70 border-amber-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{task.icon}</span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900">{task.title}</h4>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                            +{task.points} pts
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">{task.statusLabel}</p>
                        {task.zone && (
                          <span className="inline-block mt-1 text-[11px] text-slate-500 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200">
                            {task.zone.icon} {task.zone.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link
                      to={`/qr/${task.qrCode}`}
                      title="Abrir vista rápida QR"
                      className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-white transition-colors"
                    >
                      <QrCode className="w-4 h-4" />
                    </Link>
                  </div>

                  {isStock ? (
                    <div className="mt-4 pt-3 border-t border-amber-200/60 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-slate-900">
                          {task.currentStock ?? 0}
                        </span>
                        <span className="text-xs text-slate-600">
                          / {task.maxStock ?? 4} {task.unitName || 'unidades'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={busyTaskId === task.id || (task.currentStock ?? 0) <= 0}
                          onClick={() => handleStock(task, { delta: -1 })}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-800 disabled:opacity-40 shadow-sm"
                        >
                          <Minus className="w-3.5 h-3.5" /> Vaciar 1
                        </button>
                        <button
                          disabled={busyTaskId === task.id}
                          onClick={() => handleStock(task, { refillAll: true })}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" /> Recargué ({task.maxStock ?? 4})
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 pt-3 border-t border-amber-200/60 flex items-center justify-between gap-2">
                      <AssignmentBadge task={task} />
                      <button
                        disabled={busyTaskId === task.id}
                        onClick={() => handleComplete(task)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Marcar Completada
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Sección 2: Tareas para Hacer Hoy */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 px-1">
          <Clock className="w-4 h-4 text-indigo-600" />
          Para Hacer Hoy ({dueTodayTasks.length})
        </h3>

        {dueTodayTasks.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <div className="font-semibold text-slate-800">
              ¡No quedan tareas programadas pendientes por hoy!
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Puedes revisar las tareas al día o escanear un código QR si surge algo nuevo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dueTodayTasks.map((task) => (
              <div
                key={task.id}
                className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{task.icon}</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-900">{task.title}</h4>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                          +{task.points} pts
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-xs text-slate-500 mt-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {task.statusLabel}
                        </span>
                        {task.zone && (
                          <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {task.zone.icon} {task.zone.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Link
                    to={`/qr/${task.qrCode}`}
                    title="Vista rápida QR"
                    className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-50"
                  >
                    <QrCode className="w-4 h-4" />
                  </Link>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <AssignmentBadge task={task} />
                  <button
                    disabled={busyTaskId === task.id}
                    onClick={() => handleComplete(task)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" /> ¡La hice!
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sección 3: Tareas Completadas Hoy / A Demanda / Próximos días */}
      {upToDateTasks.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 px-1">
            Al día o a demanda ({upToDateTasks.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {upToDateTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 rounded-2xl bg-white/80 border border-slate-200 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl opacity-80">{task.icon}</span>
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm">{task.title}</h4>
                    <p className="text-xs text-slate-500">
                      {task.statusLabel}
                      {task.lastCompletedBy &&
                        ` · Última vez: ${task.lastCompletedBy.avatar} ${task.lastCompletedBy.name}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={busyTaskId === task.id}
                    onClick={() => handleFlagPending(task)}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-xs font-medium text-slate-600 hover:text-amber-800 transition-colors"
                  >
                    Falta hacer
                  </button>
                  <button
                    disabled={busyTaskId === task.id}
                    onClick={() => handleComplete(task)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-xs font-medium text-slate-700 hover:text-emerald-700 transition-colors"
                  >
                    Hacer igual
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const AssignmentBadge: React.FC<{ task: TaskItem }> = ({ task }) => {
  if (task.assignmentType === 'ALL' || task.assignedResidents.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
        <Users className="w-3.5 h-3.5" /> Abierta a todos
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {task.assignedResidents.map((r) => (
        <span
          key={r.id}
          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700"
        >
          <span>{r.avatar}</span>
          <span>{r.name}</span>
        </span>
      ))}
    </div>
  );
};
