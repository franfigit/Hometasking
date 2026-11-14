import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  Minus,
  Plus,
  RotateCcw,
  ArrowLeft,
  Sparkles,
  QrCode,
} from 'lucide-react';
import { TaskItem, Zone, api } from '../api/client';
import { useProfile } from '../context/ProfileContext';

export const QrQuickActionPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const { currentResident } = useProfile();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrType, setQrType] = useState<'TASK' | 'ZONE' | null>(null);
  const [singleTask, setSingleTask] = useState<TaskItem | null>(null);
  const [zone, setZone] = useState<Zone | null>(null);
  const [zoneTasks, setZoneTasks] = useState<TaskItem[]>([]);
  const [feedback, setFeedback] = useState<{
    logId: number;
    message: string;
  } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadQr = async () => {
    if (!code) return;
    try {
      setLoading(true);
      setError('');
      const res = await api.resolveQr(code);
      setQrType(res.qrType);
      if (res.qrType === 'TASK') {
        setSingleTask(res.task);
      } else {
        setZone(res.zone);
        setZoneTasks(res.tasks);
      }
    } catch (err: any) {
      setError(err.message || 'No se encontró este código QR');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQr();
  }, [code]);

  const updateTaskInState = (updated: TaskItem) => {
    if (qrType === 'TASK') {
      setSingleTask(updated);
    } else {
      setZoneTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    }
  };

  const handleComplete = async (task: TaskItem) => {
    if (!currentResident) return;
    try {
      setBusyId(task.id);
      const res = await api.completeTask(task.id, currentResident.id);
      updateTaskInState(res.task);
      setFeedback({
        logId: res.logId,
        message: `¡Listo! "${task.title}" marcada como completada (+${res.pointsEarned} pts).`,
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleFlagPending = async (task: TaskItem) => {
    if (!currentResident) return;
    try {
      setBusyId(task.id);
      const res = await api.flagTaskPending(task.id, currentResident.id);
      updateTaskInState(res.task);
      setFeedback({
        logId: res.logId,
        message: `Reportaste que falta hacer "${task.title}".`,
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleStock = async (
    task: TaskItem,
    options: { delta?: number; refillAll?: boolean }
  ) => {
    if (!currentResident) return;
    try {
      setBusyId(task.id);
      const res = await api.updateTaskStock(task.id, currentResident.id, options);
      updateTaskInState(res.task);
      setFeedback({
        logId: res.logId,
        message: options.refillAll
          ? `¡Stock recargado al máximo (+${res.pointsEarned} pts)!`
          : `Se descontó 1 unidad. Quedan ${res.task.currentStock} ${
              res.task.unitName || 'unidades'
            }.`,
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleUndo = async () => {
    if (!feedback) return;
    try {
      await api.undoLog(feedback.logId);
      setFeedback(null);
      await loadQr();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-500">
        Leyendo puesto QR <span className="font-mono font-semibold">{code}</span>...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-3xl border border-slate-200 text-center space-y-4">
        <div className="text-4xl">🔍</div>
        <h2 className="text-lg font-bold text-slate-900">Código QR no encontrado</h2>
        <p className="text-sm text-slate-500">{error}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Ir al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al panel principal
        </Link>
        <span className="inline-flex items-center gap-1.5 text-xs font-mono bg-slate-200/70 text-slate-700 px-2.5 py-1 rounded-lg">
          <QrCode className="w-3.5 h-3.5" /> {code}
        </span>
      </div>

      {/* Notificación grande con botón Deshacer */}
      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-900 text-white shadow-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-sm font-medium">
            <Sparkles className="w-5 h-5 text-amber-300 shrink-0" />
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={handleUndo}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-emerald-950 font-bold text-xs shrink-0 shadow-sm hover:bg-emerald-50"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Deshacer
          </button>
        </div>
      )}

      {/* Caso 1: QR de Tarea Individual */}
      {qrType === 'TASK' && singleTask && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-20 h-20 rounded-3xl bg-indigo-50 text-5xl flex items-center justify-center mx-auto shadow-inner">
              {singleTask.icon}
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
              +{singleTask.points} puntos de esfuerzo
            </div>
            <h2 className="text-2xl font-black text-slate-900">{singleTask.title}</h2>
            {singleTask.description && (
              <p className="text-sm text-slate-500">{singleTask.description}</p>
            )}
            <div className="pt-1">
              <span
                className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold ${
                  singleTask.isUrgent
                    ? 'bg-amber-100 text-amber-800'
                    : singleTask.completedToday
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                Estado: {singleTask.statusLabel}
              </span>
            </div>
          </div>

          <QuickActionButtons
            task={singleTask}
            busy={busyId === singleTask.id}
            onComplete={() => handleComplete(singleTask)}
            onFlagPending={() => handleFlagPending(singleTask)}
            onStock={(opts) => handleStock(singleTask, opts)}
          />

          {singleTask.lastCompletedBy && singleTask.lastCompletedAt && (
            <p className="text-center text-xs text-slate-400 pt-2 border-t border-slate-100">
              Última vez realizada por {singleTask.lastCompletedBy.avatar}{' '}
              <strong className="text-slate-600">{singleTask.lastCompletedBy.name}</strong> (
              {new Date(singleTask.lastCompletedAt).toLocaleString('es-AR', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
              )
            </p>
          )}
        </div>
      )}

      {/* Caso 2: QR de Puesto / Sector con múltiples tareas */}
      {qrType === 'ZONE' && zone && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 text-center shadow-sm">
            <div className="text-4xl mb-1">{zone.icon}</div>
            <h2 className="text-xl font-black text-slate-900">{zone.name}</h2>
            {zone.description && (
              <p className="text-xs text-slate-500 mt-1">{zone.description}</p>
            )}
          </div>

          {zoneTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4"
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{task.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-slate-900 text-lg">{task.title}</h3>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                      +{task.points} pts
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{task.statusLabel}</p>
                </div>
              </div>

              <QuickActionButtons
                task={task}
                busy={busyId === task.id}
                onComplete={() => handleComplete(task)}
                onFlagPending={() => handleFlagPending(task)}
                onStock={(opts) => handleStock(task, opts)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const QuickActionButtons: React.FC<{
  task: TaskItem;
  busy: boolean;
  onComplete: () => void;
  onFlagPending: () => void;
  onStock: (opts: { delta?: number; refillAll?: boolean }) => void;
}> = ({ task, busy, onComplete, onFlagPending, onStock }) => {
  if (task.type === 'STOCK') {
    const current = task.currentStock ?? 0;
    const max = task.maxStock ?? 4;
    return (
      <div className="space-y-3">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">
            Stock disponible ({task.unitName || 'unidades'}):
          </span>
          <span className="text-2xl font-black text-slate-900">
            {current} <span className="text-sm font-normal text-slate-400">/ {max}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            disabled={busy || current <= 0}
            onClick={() => onStock({ delta: -1 })}
            className="w-full py-4 px-4 rounded-2xl border-2 border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-base flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
          >
            <Minus className="w-5 h-5" /> Se vació 1 (-1)
          </button>

          <button
            disabled={busy}
            onClick={() => onStock({ refillAll: true })}
            className="w-full py-4 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base flex items-center justify-center gap-2 shadow-md transition-colors disabled:opacity-40"
          >
            <Plus className="w-5 h-5" /> ¡Fui a recargar! ({max})
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <button
        disabled={busy}
        onClick={onComplete}
        className="w-full py-4 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base flex items-center justify-center gap-2 shadow-md transition-colors disabled:opacity-40"
      >
        <CheckCircle2 className="w-5 h-5" /> ¡Marcar Completada!
      </button>

      <button
        disabled={busy}
        onClick={onFlagPending}
        className="w-full py-4 px-4 rounded-2xl border-2 border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-base flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
      >
        <AlertTriangle className="w-5 h-5" /> Falta hacer / Pendiente
      </button>
    </div>
  );
};
