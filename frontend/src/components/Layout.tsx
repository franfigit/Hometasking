import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 pb-20 md:pb-0">
      <Header />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">{children}</main>
      <Footer />
    </div>
  );
};
