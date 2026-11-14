import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, ExternalLink, Globe } from 'lucide-react';
import { TaskItem, Zone, api } from '../api/client';

export const QrSheetPage: React.FC = () => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [baseUrl, setBaseUrl] = useState<string>(window.location.origin);
  const [filterMode, setFilterMode] = useState<'ALL' | 'TASKS' | 'ZONES'>('ALL');

  useEffect(() => {
    Promise.all([api.getTasks(), api.getZones()]).then(([t, z]) => {
      setTasks(t);
      setZones(z);
    });
  }, []);

  const buildUrl = (code: string) => `${baseUrl.replace(/\/$/, '')}/qr/${code}`;

  return (
    <div className="space-y-6">
      {/* Controles (no se imprimen) */}
      <div className="no-print bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Planilla de Códigos QR Imprimibles
            </h2>
            <p className="text-sm text-slate-500">
              Imprimí y pegá estos códigos en el dispensador de agua, cocina o lavadero para acceso instantáneo.
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm self-start sm:self-auto"
          >
            <Printer className="w-4 h-4" /> Imprimir Planilla
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-indigo-600" /> URL base de tu servidor en la red local (LAN)
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="Ej. http://192.168.1.50:5173"
              className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Asegurate de usar la IP local del servidor (ej. 192.168.0.X) antes de imprimir para que los celulares puedan abrir el enlace.
            </p>
          </div>

          <div className="flex items-end justify-start md:justify-end">
            <div className="inline-flex p-1 rounded-xl bg-slate-100">
              {(
                [
                  { id: 'ALL', label: 'Todos los QRs' },
                  { id: 'TASKS', label: 'Solo Tareas' },
                  { id: 'ZONES', label: 'Solo Sectores' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterMode(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    filterMode === tab.id
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grilla de Tarjetas QR (lista para recortar en papel) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 print:grid-cols-2 print:gap-4">
        {(filterMode === 'ALL' || filterMode === 'ZONES') &&
          zones.map((z) => (
            <div
              key={`zone-${z.id}`}
              className="bg-white rounded-3xl border-2 border-dashed border-indigo-300 p-5 flex flex-col items-center text-center space-y-3 break-inside-avoid"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                Puesto / Sector
              </span>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{z.icon}</span>
                <h3 className="font-bold text-slate-900 text-base">{z.name}</h3>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <QRCodeSVG value={buildUrl(z.qrCode)} size={148} level="M" />
              </div>
              <p className="text-[11px] font-mono text-slate-400">{z.qrCode}</p>
              <Link
                to={`/qr/${z.qrCode}`}
                className="no-print inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
              >
                Probar pantalla QR <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          ))}

        {(filterMode === 'ALL' || filterMode === 'TASKS') &&
          tasks.map((t) => (
            <div
              key={`task-${t.id}`}
              className="bg-white rounded-3xl border-2 border-dashed border-slate-300 p-5 flex flex-col items-center text-center space-y-3 break-inside-avoid"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                Tarea Directa · +{t.points} pts
              </span>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{t.icon}</span>
                <h3 className="font-bold text-slate-900 text-base">{t.title}</h3>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <QRCodeSVG value={buildUrl(t.qrCode)} size={148} level="M" />
              </div>
              <p className="text-[11px] font-mono text-slate-400">{t.qrCode}</p>
              <Link
                to={`/qr/${t.qrCode}`}
                className="no-print inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
              >
                Probar pantalla QR <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          ))}
      </div>
    </div>
  );
};
