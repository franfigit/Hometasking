import React, { useState } from 'react';
import { Lock, ShieldCheck, ArrowRight } from 'lucide-react';
import { Resident } from '../api/client';
import { useProfile } from '../context/ProfileContext';

export const ProfileSelector: React.FC = () => {
  const { residents, selectResident } = useProfile();
  const [selected, setSelected] = useState<Resident | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const activeResidents = residents.filter((r) => r.active);

  const handleChoose = async (resident: Resident) => {
    setError('');
    if (resident.hasPin) {
      setSelected(resident);
      setPin('');
      return;
    }
    try {
      setSubmitting(true);
      await selectResident(resident);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    try {
      setSubmitting(true);
      setError('');
      await selectResident(selected, pin);
    } catch (err: any) {
      setError(err.message || 'PIN incorrecto');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white text-3xl flex items-center justify-center mx-auto mb-3 shadow-md">
            🏠
          </div>
          <h1 className="text-2xl font-bold text-slate-900">¿Quién sos?</h1>
          <p className="text-sm text-slate-500 mt-1">
            Elegí tu perfil para registrar tareas y usar los códigos QR sin volver a iniciar sesión.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm text-center font-medium">
            {error}
          </div>
        )}

        {!selected ? (
          <div className="grid grid-cols-1 gap-3">
            {activeResidents.map((r) => (
              <button
                key={r.id}
                disabled={submitting}
                onClick={() => handleChoose(r)}
                className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
                    style={{ backgroundColor: `${r.color}20`, color: r.color }}
                  >
                    {r.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      {r.name}
                      {r.role === 'ADMIN' && (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                          <ShieldCheck className="w-3 h-3" /> Admin
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      {r.hasPin ? (
                        <>
                          <Lock className="w-3 h-3 text-slate-400" /> Requiere PIN
                        </>
                      ) : (
                        'Ingreso rápido (sin PIN)'
                      )}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-2xl">{selected.avatar}</span>
              <div className="flex-1">
                <div className="font-semibold text-slate-900">{selected.name}</div>
                <div className="text-xs text-slate-500">Ingresá tu PIN de acceso</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setError('');
                }}
                className="text-xs text-indigo-600 font-medium hover:underline"
              >
                Cambiar
              </button>
            </div>

            <div>
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="PIN (ej. 1234)"
                className="w-full text-center text-2xl tracking-widest font-bold py-3 px-4 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-slate-400 text-center mt-1.5">
                Tip demo: el PIN inicial de Francisco es 1234
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || !pin}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold shadow-sm transition-colors"
            >
              {submitting ? 'Verificando...' : 'Entrar'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
