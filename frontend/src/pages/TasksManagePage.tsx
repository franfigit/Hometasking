import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit3, ShieldAlert, FolderPlus } from 'lucide-react';
import {
  TaskItem,
  TaskType,
  WeatherCondition,
  AssignmentType,
  Zone,
  api,
} from '../api/client';
import { useProfile } from '../context/ProfileContext';

const DAYS_LABELS = [
  { day: 1, label: 'Lun' },
  { day: 2, label: 'Mar' },
  { day: 3, label: 'Mié' },
  { day: 4, label: 'Jue' },
  { day: 5, label: 'Vie' },
  { day: 6, label: 'Sáb' },
  { day: 0, label: 'Dom' },
];

export const TasksManagePage: React.FC = () => {
  const { currentResident, residents } = useProfile();
  const isAdmin = currentResident?.role === 'ADMIN';

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de Tarea
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  // Campos del formulario de Tarea
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🧹');
  const [points, setPoints] = useState(2);
  const [type, setType] = useState<TaskType>('FIXED_SCHEDULE');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [timeOfDay, setTimeOfDay] = useState('');
  const [intervalDays, setIntervalDays] = useState(2);
  const [currentStock, setCurrentStock] = useState(2);
  const [minThreshold, setMinThreshold] = useState(1);
  const [maxStock, setMaxStock] = useState(4);
  const [unitName, setUnitName] = useState('bidones llenos');
  const [weatherCondition, setWeatherCondition] = useState<WeatherCondition>('RAIN_FORECAST');
  const [weatherLeadHours, setWeatherLeadHours] = useState(24);
  const [weatherMinProbability, setWeatherMinProbability] = useState(50);
  const [weatherThresholdValue, setWeatherThresholdValue] = useState<number>(40);
  const [weatherCooldownDays, setWeatherCooldownDays] = useState(3);
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('ALL');
  const [assignedIds, setAssignedIds] = useState<number[]>([]);
  const [zoneId, setZoneId] = useState<number | ''>('');

  // Modal de Sector
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [zoneName, setZoneName] = useState('');
  const [zoneIcon, setZoneIcon] = useState('📍');
  const [zoneDesc, setZoneDesc] = useState('');

  const loadAll = async () => {
    try {
      setLoading(true);
      const [tList, zList] = await Promise.all([api.getTasks(), api.getZones()]);
      setTasks(tList);
      setZones(zList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openNewTask = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setIcon('🧹');
    setPoints(2);
    setType('FIXED_SCHEDULE');
    setDaysOfWeek([0, 1, 2, 3, 4, 5, 6]);
    setTimeOfDay('');
    setIntervalDays(2);
    setCurrentStock(2);
    setMinThreshold(1);
    setMaxStock(4);
    setUnitName('bidones llenos');
    setWeatherCondition('RAIN_FORECAST');
    setWeatherLeadHours(24);
    setWeatherMinProbability(50);
    setWeatherThresholdValue(40);
    setWeatherCooldownDays(3);
    setAssignmentType('ALL');
    setAssignedIds([]);
    setZoneId(zones[0]?.id || '');
    setShowTaskModal(true);
  };

  const openEditTask = (t: TaskItem) => {
    setEditingTask(t);
    setTitle(t.title);
    setDescription(t.description || '');
    setIcon(t.icon);
    setPoints(t.points);
    setType(t.type);
    setDaysOfWeek(t.daysOfWeek && t.daysOfWeek.length > 0 ? t.daysOfWeek : [0, 1, 2, 3, 4, 5, 6]);
    setTimeOfDay(t.timeOfDay || '');
    setIntervalDays(t.intervalDays || 2);
    setCurrentStock(t.currentStock ?? 2);
    setMinThreshold(t.minThreshold ?? 1);
    setMaxStock(t.maxStock ?? 4);
    setUnitName(t.unitName || 'unidades');
    setWeatherCondition(t.weatherCondition || 'RAIN_FORECAST');
    setWeatherLeadHours(t.weatherLeadHours ?? 24);
    setWeatherMinProbability(t.weatherMinProbability ?? 50);
    setWeatherThresholdValue(t.weatherThresholdValue ?? 40);
    setWeatherCooldownDays(t.weatherCooldownDays ?? 3);
    setAssignmentType(t.assignmentType);
    setAssignedIds(t.assignedResidents.map((r) => r.id));
    setZoneId(t.zone?.id || '');
    setShowTaskModal(true);
  };

  const toggleDay = (d: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const toggleResident = (id: number) => {
    if (assignmentType === 'SINGLE') {
      setAssignedIds([id]);
      return;
    }
    setAssignedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title,
      description: description || undefined,
      icon,
      points,
      type,
      daysOfWeek: type === 'FIXED_SCHEDULE' ? daysOfWeek : undefined,
      timeOfDay: type === 'FIXED_SCHEDULE' && timeOfDay ? timeOfDay : undefined,
      intervalDays: type === 'INTERVAL' ? intervalDays : undefined,
      currentStock: type === 'STOCK' ? currentStock : undefined,
      minThreshold: type === 'STOCK' ? minThreshold : undefined,
      maxStock: type === 'STOCK' ? maxStock : undefined,
      unitName: type === 'STOCK' ? unitName : undefined,
      weatherCondition: type === 'WEATHER' ? weatherCondition : undefined,
      weatherLeadHours: type === 'WEATHER' ? weatherLeadHours : undefined,
      weatherMinProbability: type === 'WEATHER' ? weatherMinProbability : undefined,
      weatherThresholdValue: type === 'WEATHER' ? weatherThresholdValue : undefined,
      weatherCooldownDays: type === 'WEATHER' ? weatherCooldownDays : undefined,
      assignmentType,
      assignedResidentIds: assignmentType === 'ALL' ? [] : assignedIds,
      zoneId: zoneId === '' ? null : Number(zoneId),
    };

    try {
      if (editingTask) {
        await api.updateTask(editingTask.id, payload);
      } else {
        await api.createTask(payload);
      }
      setShowTaskModal(false);
      await loadAll();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (!confirm('¿Seguro que querés eliminar esta tarea?')) return;
    try {
      await api.deleteTask(id);
      await loadAll();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createZone({
        name: zoneName,
        icon: zoneIcon,
        description: zoneDesc || undefined,
      });
      setZoneName('');
      setZoneDesc('');
      setShowZoneModal(false);
      await loadAll();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteZone = async (id: number) => {
    if (!confirm('¿Eliminar este sector/puesto?')) return;
    try {
      await api.deleteZone(id);
      await loadAll();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-slate-500">Cargando catálogo...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Tareas y Sectores</h2>
          <p className="text-sm text-slate-500">
            Configurá la frecuencia, puntos de esfuerzo, stock y responsables de cada tarea.
          </p>
        </div>

        {isAdmin ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowZoneModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-sm"
            >
              <FolderPlus className="w-4 h-4 text-indigo-600" /> Nuevo Sector
            </button>
            <button
              onClick={openNewTask}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-sm"
            >
              <Plus className="w-4 h-4" /> Nueva Tarea
            </button>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            Modo lectura: cambiá a un perfil Administrador para crear o editar tareas.
          </div>
        )}
      </div>

      {/* Lista de Sectores / Puestos */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Sectores / Puestos con QR ({zones.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {zones.map((z) => (
            <div
              key={z.id}
              className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between gap-2 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{z.icon}</span>
                <div>
                  <div className="font-bold text-slate-900 text-sm">{z.name}</div>
                  <div className="text-xs text-slate-500">
                    {z.taskCount || 0} tarea(s) · <span className="font-mono">{z.qrCode}</span>
                  </div>
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={() => handleDeleteZone(z.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                  title="Eliminar sector"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Lista de Tareas */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Todas las Tareas ({tasks.length})
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {tasks.map((t) => (
            <div
              key={t.id}
              className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <span className="text-3xl">{t.icon}</span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-slate-900">{t.title}</h4>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                      {t.points} pts
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {t.type === 'FIXED_SCHEDULE' && '📅 Periódica fija'}
                      {t.type === 'INTERVAL' && `🔄 Cada ${t.intervalDays} días`}
                      {t.type === 'STOCK' &&
                        `🚰 Stock (${t.currentStock}/${t.maxStock} ${t.unitName})`}
                      {t.type === 'ON_DEMAND' && '🔔 A demanda'}
                    </span>
                    {t.zone && (
                      <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                        {t.zone.icon} {t.zone.name}
                      </span>
                    )}
                  </div>
                  {t.description && (
                    <p className="text-xs text-slate-500">{t.description}</p>
                  )}
                  <div className="text-xs text-slate-400">
                    Asignación:{' '}
                    {t.assignmentType === 'ALL'
                      ? 'Abierta a todos los residentes'
                      : t.assignedResidents.map((r) => `${r.avatar} ${r.name}`).join(', ')}
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => openEditTask(t)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button
                    onClick={() => handleDeleteTask(t.id)}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-red-50 hover:border-red-200 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Modal Crear / Editar Tarea */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900">
              {editingTask ? 'Editar Tarea' : 'Nueva Tarea del Hogar'}
            </h3>

            <form onSubmit={handleSaveTask} className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Ícono
                  </label>
                  <input
                    type="text"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="w-full text-center text-2xl py-2 px-3 rounded-xl border border-slate-300"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nombre de la tarea
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej. Barrer planta baja"
                    className="w-full py-2.5 px-3.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Descripción / Instrucciones (opcional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej. Incluye comedor y pasillo"
                  className="w-full py-2 px-3.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Puntos de esfuerzo (1 a 5)
                  </label>
                  <select
                    value={points}
                    onChange={(e) => setPoints(Number(e.target.value))}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value={1}>1 pt (Muy rápida - 2 min)</option>
                    <option value={2}>2 pts (Ligera - 5 a 10 min)</option>
                    <option value={3}>3 pts (Media - 15 min)</option>
                    <option value={4}>4 pts (Pesada - 30 min)</option>
                    <option value={5}>5 pts (Gran esfuerzo / Salir)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Puesto / Sector
                  </label>
                  <select
                    value={zoneId}
                    onChange={(e) =>
                      setZoneId(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="">Sin sector específico</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.icon} {z.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selector de Tipo de Comportamiento */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Tipo de frecuencia / comportamiento
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as TaskType)}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm bg-white font-medium"
                >
                  <option value="FIXED_SCHEDULE">
                    📅 Periódica fija (días de la semana)
                  </option>
                  <option value="INTERVAL">
                    🔄 Periódica flotante (cada N días desde que se hizo)
                  </option>
                  <option value="STOCK">
                    🚰 Contador / Stock con umbral (ej. Bidones de agua)
                  </option>
                  <option value="ON_DEMAND">
                    🔔 A demanda (se activa manualmente cuando hace falta)
                  </option>
                  <option value="WEATHER">
                    🌦️ Por clima (se activa según pronóstico, ej. antes de lluvia)
                  </option>
                </select>
              </div>

              {type === 'FIXED_SCHEDULE' && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Días que se repite
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {DAYS_LABELS.map((d) => (
                        <button
                          type="button"
                          key={d.day}
                          onClick={() => toggleDay(d.day)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            daysOfWeek.includes(d.day)
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white border border-slate-300 text-slate-600'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Hora o momento sugerido (opcional)
                    </label>
                    <input
                      type="time"
                      value={timeOfDay}
                      onChange={(e) => setTimeOfDay(e.target.value)}
                      className="py-1.5 px-3 rounded-xl border border-slate-300 text-sm bg-white"
                    />
                  </div>
                </div>
              )}

              {type === 'INTERVAL' && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Repetir cada cuántos días desde la última vez que se completó
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={intervalDays}
                      onChange={(e) => setIntervalDays(Number(e.target.value))}
                      className="w-24 py-2 px-3 rounded-xl border border-slate-300 text-sm bg-white"
                    />
                    <span className="text-xs text-slate-600">
                      días (ej. 2 = día por medio)
                    </span>
                  </div>
                </div>
              )}

              {type === 'STOCK' && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Stock actual
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={currentStock}
                        onChange={(e) => setCurrentStock(Number(e.target.value))}
                        className="w-full py-2 px-3 rounded-xl border border-slate-300 text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Umbral alerta
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={minThreshold}
                        onChange={(e) => setMinThreshold(Number(e.target.value))}
                        className="w-full py-2 px-3 rounded-xl border border-slate-300 text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Stock máximo
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={maxStock}
                        onChange={(e) => setMaxStock(Number(e.target.value))}
                        className="w-full py-2 px-3 rounded-xl border border-slate-300 text-sm bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Nombre de la unidad
                    </label>
                    <input
                      type="text"
                      value={unitName}
                      onChange={(e) => setUnitName(e.target.value)}
                      placeholder="Ej. bidones llenos"
                      className="w-full py-2 px-3 rounded-xl border border-slate-300 text-sm bg-white"
                    />
                  </div>
                </div>
              )}

              {type === 'WEATHER' && (
                <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Condición climática
                      </label>
                      <select
                        value={weatherCondition}
                        onChange={(e) => {
                          const cond = e.target.value as WeatherCondition;
                          setWeatherCondition(cond);
                          if (cond === 'HIGH_WIND') setWeatherThresholdValue(40);
                          if (cond === 'EXTREME_HEAT') setWeatherThresholdValue(33);
                          if (cond === 'FROST_OR_COLD') setWeatherThresholdValue(5);
                        }}
                        className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs bg-white font-medium"
                      >
                        <option value="RAIN_FORECAST">🌧️ Lluvia próxima</option>
                        <option value="STORM_FORECAST">⛈️ Tormenta / lluvia fuerte</option>
                        <option value="HIGH_WIND">💨 Viento fuerte</option>
                        <option value="EXTREME_HEAT">🔥 Calor extremo</option>
                        <option value="FROST_OR_COLD">❄️ Frío / Helada</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Anticipación (horas antes)
                      </label>
                      <select
                        value={weatherLeadHours}
                        onChange={(e) => setWeatherLeadHours(Number(e.target.value))}
                        className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs bg-white font-medium"
                      >
                        <option value={6}>6 horas antes</option>
                        <option value={12}>12 horas antes</option>
                        <option value={24}>24 horas antes (1 día)</option>
                        <option value={48}>48 horas antes (2 días)</option>
                        <option value={72}>72 horas antes (3 días)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {weatherCondition === 'RAIN_FORECAST' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Probabilidad mínima (%)
                        </label>
                        <input
                          type="number"
                          min={10}
                          max={100}
                          value={weatherMinProbability}
                          onChange={(e) => setWeatherMinProbability(Number(e.target.value))}
                          className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs bg-white"
                        />
                      </div>
                    )}

                    {(weatherCondition === 'HIGH_WIND' ||
                      weatherCondition === 'EXTREME_HEAT' ||
                      weatherCondition === 'FROST_OR_COLD') && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {weatherCondition === 'HIGH_WIND'
                            ? 'Umbral viento (km/h)'
                            : weatherCondition === 'EXTREME_HEAT'
                            ? 'Temperatura ≥ (°C)'
                            : 'Temperatura ≤ (°C)'}
                        </label>
                        <input
                          type="number"
                          value={weatherThresholdValue}
                          onChange={(e) => setWeatherThresholdValue(Number(e.target.value))}
                          className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs bg-white"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Espera tras completar (días)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={weatherCooldownDays}
                        onChange={(e) => setWeatherCooldownDays(Number(e.target.value))}
                        className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Asignación de Responsables */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600">
                  Asignación de responsables
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'ALL', label: 'Abierta a todos' },
                      { id: 'SINGLE', label: 'A uno solo' },
                      { id: 'GROUP', label: 'Grupo selecto' },
                    ] as const
                  ).map((opt) => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => {
                        setAssignmentType(opt.id);
                        if (opt.id === 'SINGLE' && assignedIds.length > 1) {
                          setAssignedIds([assignedIds[0]]);
                        }
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold border ${
                        assignmentType === opt.id
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {assignmentType !== 'ALL' && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {residents.map((r) => {
                      const active = assignedIds.includes(r.id);
                      return (
                        <button
                          type="button"
                          key={r.id}
                          onClick={() => toggleResident(r.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                            active
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'bg-white border-slate-300 text-slate-700'
                          }`}
                        >
                          <span>{r.avatar}</span>
                          <span>{r.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-sm"
                >
                  Guardar Tarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Sector */}
      {showZoneModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Nuevo Sector / Puesto QR</h3>
            <form onSubmit={handleCreateZone} className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Ícono
                  </label>
                  <input
                    type="text"
                    value={zoneIcon}
                    onChange={(e) => setZoneIcon(e.target.value)}
                    className="w-full text-center text-2xl py-2 px-3 rounded-xl border border-slate-300"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nombre del Puesto / Sector
                  </label>
                  <input
                    type="text"
                    required
                    value={zoneName}
                    onChange={(e) => setZoneName(e.target.value)}
                    placeholder="Ej. Baño Principal"
                    className="w-full py-2.5 px-3.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Descripción (opcional)
                </label>
                <input
                  type="text"
                  value={zoneDesc}
                  onChange={(e) => setZoneDesc(e.target.value)}
                  placeholder="Ej. Tareas del baño y toallas"
                  className="w-full py-2 px-3.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowZoneModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white"
                >
                  Crear Sector
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
