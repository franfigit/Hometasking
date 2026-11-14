import React, { useState } from 'react';
import { Plus, ShieldCheck, Trash2, Lock, Edit3, ShieldAlert } from 'lucide-react';
import { Resident, ResidentRole, api } from '../api/client';
import { useProfile } from '../context/ProfileContext';

const AVATARS = ['🧑‍💻', '👩‍🎨', '🧑‍🍳', '🦸', '🧙', '🐱', '🐶', '🦊', '🐼', '🦁'];
const COLORS = ['#4F46E5', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6'];

export const ResidentsPage: React.FC = () => {
  const { residents, currentResident, refreshResidents } = useProfile();
  const isAdmin = currentResident?.role === 'ADMIN';

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Resident | null>(null);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [role, setRole] = useState<ResidentRole>('RESIDENT');
  const [pin, setPin] = useState('');

  const openNew = () => {
    setEditing(null);
    setName('');
    setAvatar(AVATARS[Math.floor(Math.random() * AVATARS.length)]);
    setColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
    setRole('RESIDENT');
    setPin('');
    setShowModal(true);
  };

  const openEdit = (r: Resident) => {
    setEditing(r);
    setName(r.name);
    setAvatar(r.avatar);
    setColor(r.color);
    setRole(r.role);
    setPin('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        const payload: any = { name, avatar, color, role };
        if (pin !== '') payload.pin = pin === 'CLEAR' ? '' : pin;
        await api.updateResident(editing.id, payload);
      } else {
        await api.createResident({
          name,
          avatar,
          color,
          role,
          pin: pin || undefined,
        });
      }
      setShowModal(false);
      await refreshResidents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (r: Resident) => {
    if (r.id === currentResident?.id) {
      alert('No podés eliminar el perfil con el que estás conectado actualmente.');
      return;
    }
    if (!confirm(`¿Eliminar a ${r.name} del hogar?`)) return;
    try {
      await api.deleteResident(r.id);
      await refreshResidents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Residentes del Hogar</h2>
          <p className="text-sm text-slate-500">
            Administrá los miembros de la casa, sus roles y PIN opcional de acceso.
          </p>
        </div>

        {isAdmin ? (
          <button
            onClick={openNew}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Agregar Residente
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            Solo los Administradores pueden agregar o editar residentes.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {residents.map((r) => (
          <div
            key={r.id}
            className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between gap-4"
          >
            <div className="flex items-center gap-3.5">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-xs"
                style={{ backgroundColor: `${r.color}20`, color: r.color }}
              >
                {r.avatar}
              </div>
              <div>
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  {r.name}
                  {r.role === 'ADMIN' && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      <ShieldCheck className="w-3 h-3" /> Admin
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  {r.hasPin ? (
                    <>
                      <Lock className="w-3 h-3 text-slate-400" /> Con PIN configurado
                    </>
                  ) : (
                    'Sin PIN (acceso en 1 toque)'
                  )}
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => openEdit(r)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Editar
                </button>
                {r.id !== currentResident?.id && (
                  <button
                    onClick={() => handleDelete(r)}
                    className="p-1.5 rounded-xl border border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              {editing ? `Editar a ${editing.name}` : 'Nuevo Residente'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Sofía"
                  className="w-full py-2.5 px-3.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Avatar
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVATARS.map((av) => (
                    <button
                      type="button"
                      key={av}
                      onClick={() => setAvatar(av)}
                      className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center border ${
                        avatar === av
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-slate-200'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Color identificatorio
                </label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full border-2 ${
                        color === c ? 'border-slate-900 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Rol en el hogar
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as ResidentRole)}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="RESIDENT">Residente</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    PIN opcional
                  </label>
                  <input
                    type="text"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder={editing ? 'Dejar vacío o CLEAR' : 'Sin PIN'}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
