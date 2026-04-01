import React, { createContext, useContext, useState, useCallback } from 'react';

interface PillarFilterContextType {
  selectedPillar: string | null;
  setSelectedPillar: (pillar: string | null) => void;
  togglePillar: (pillar: string) => void;
}

const PillarFilterContext = createContext<PillarFilterContextType | null>(null);

export function PillarFilterProvider({ children }: { children: React.ReactNode }) {
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);

  const togglePillar = useCallback((pillar: string) => {
    setSelectedPillar(prev => prev === pillar ? null : pillar);
  }, []);

  return (
    <PillarFilterContext.Provider value={{ selectedPillar, setSelectedPillar, togglePillar }}>
      {children}
    </PillarFilterContext.Provider>
  );
}

export function usePillarFilter() {
  const ctx = useContext(PillarFilterContext);
  if (!ctx) throw new Error('usePillarFilter must be used within PillarFilterProvider');
  return ctx;
}

// Consistent color mapping for service pillars
export const PILLAR_COLORS: Record<string, string> = {
  'Software Dev': 'hsl(174,83%,32%)',
  'Marketing': 'hsl(160,84%,39%)',
  'Consulting': 'hsl(38,92%,50%)',
  'Cybersecurity': 'hsl(0,84%,60%)',
  'Finance': 'hsl(217,91%,60%)',
  'PreSales': 'hsl(262,83%,58%)',
  'PostSales': 'hsl(220,9%,46%)',
};

export function getPillarColor(pillar: string): string {
  return PILLAR_COLORS[pillar] || 'hsl(220,9%,46%)';
}
