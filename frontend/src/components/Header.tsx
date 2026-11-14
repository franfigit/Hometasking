import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  ListChecks,
  QrCode,
  Trophy,
  Users,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useProfile } from '../context/ProfileContext';

export const navItems = [
  { to: '/', label: 'Hoy', icon: Home },
  { to: '/tasks', label: 'Tareas', icon: ListChecks },
  { to: '/qr-sheet', label: 'QRs', icon: QrCode },
  { to: '/stats', label: 'Ranking', icon: Trophy },
  { to: '/residents', label: 'Hogar', icon: Users },
];

export const Header: React.FC = () => {
  const { currentResident, logoutResident } = useProfile();

  return (
    <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xl shadow-sm">
            🏠
          </div>
          <h1 className="font-bold text-slate-900 leading-tight text-lg">
            Hometasking
          </h1>
        </div>

        {/* Navegación Desktop */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Perfil Activo */}
        {currentResident && (
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50"
              title={`Conectado como ${currentResident.name}`}
            >
              <span className="text-lg">{currentResident.avatar}</span>
              <div className="text-left">
                <div className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                  {currentResident.name}
                  {currentResident.role === 'ADMIN' && (
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={logoutResident}
              title="Cambiar de residente"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
