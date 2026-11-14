import React from 'react';
import { NavLink } from 'react-router-dom';
import { navItems } from './Header';

export const Footer: React.FC = () => {
  return (
    <>
      {/* Footer Desktop */}
      <footer className="no-print hidden md:block bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between text-xs text-slate-500">
          <span>🏠 Hometasking</span>
          <span>Red local del hogar</span>
        </div>
      </footer>

      {/* Barra de Navegación Inferior Mobile */}
      <nav className="no-print md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 flex justify-around py-1.5 px-2 shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-3 rounded-xl text-xs font-medium transition-colors ${
                  isActive ? 'text-indigo-600 bg-indigo-50/70' : 'text-slate-500'
                }`
              }
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
};
