import React, { createContext, useContext, useState, useMemo } from 'react';

interface WeekContextType {
  weekStart: Date;
  weekEnd: Date;
  setWeekStart: (d: Date) => void;
  setWeekEnd: (d: Date) => void;
  rangeMode: string;
  setRangeMode: (m: string) => void;
}

const WeekContext = createContext<WeekContextType>(null!);

export function useWeek() { return useContext(WeekContext); }

export function WeekProvider({ children }: { children: React.ReactNode }) {
  const [weekStart, setWeekStart] = useState(new Date('2025-09-29'));
  const [weekEnd, setWeekEnd] = useState(new Date('2025-10-05'));
  const [rangeMode, setRangeMode] = useState('custom');

  return (
    <WeekContext.Provider value={{ weekStart, weekEnd, setWeekStart, setWeekEnd, rangeMode, setRangeMode }}>
      {children}
    </WeekContext.Provider>
  );
}
