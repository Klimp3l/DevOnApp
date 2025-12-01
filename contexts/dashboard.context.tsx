import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useFarms } from '@/hooks/use-reference-data';

interface DashboardContextData {
  selectedFarmId: number | null;
  setSelectedFarmId: (farmId: number | null) => void;
}

const DashboardContext = createContext<DashboardContextData>({} as DashboardContextData);

interface DashboardProviderProps {
  children: ReactNode;
}

export function DashboardProvider({ children }: DashboardProviderProps) {
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);
  const { farms, loading: loadingFarms } = useFarms();

  useEffect(() => {
    if (!loadingFarms && farms.length > 0 && !selectedFarmId) {
      // Seleciona a primeira fazenda automaticamente
      setSelectedFarmId(farms[0].farmId);
    }
  }, [farms, loadingFarms]);

  return (
    <DashboardContext.Provider
      value={{
        selectedFarmId,
        setSelectedFarmId,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);

  if (!context) {
    throw new Error('useDashboard deve ser usado dentro de um DashboardProvider');
  }

  return context;
}


