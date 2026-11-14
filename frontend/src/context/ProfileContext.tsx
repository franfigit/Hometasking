import React, { createContext, useContext, useState, useEffect } from 'react';
import { Resident, api } from '../api/client';

interface ProfileContextValue {
  residents: Resident[];
  currentResident: Resident | null;
  loading: boolean;
  selectResident: (resident: Resident, pin?: string) => Promise<void>;
  logoutResident: () => void;
  refreshResidents: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

const STORAGE_KEY = 'hometasking_resident_id';

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [currentResident, setCurrentResident] = useState<Resident | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshResidents = async () => {
    try {
      const list = await api.getResidents();
      setResidents(list);
      const savedId = localStorage.getItem(STORAGE_KEY);
      if (savedId) {
        const found = list.find((r) => r.id === Number(savedId) && r.active);
        setCurrentResident(found || null);
      }
    } catch (err) {
      console.error('Error cargando residentes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshResidents();
  }, []);

  const selectResident = async (resident: Resident, pin?: string) => {
    if (resident.hasPin) {
      await api.verifyPin(resident.id, pin || '');
    }
    localStorage.setItem(STORAGE_KEY, String(resident.id));
    setCurrentResident(resident);
  };

  const logoutResident = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentResident(null);
  };

  return (
    <ProfileContext.Provider
      value={{
        residents,
        currentResident,
        loading,
        selectResident,
        logoutResident,
        refreshResidents,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile debe usarse dentro de ProfileProvider');
  return ctx;
}
