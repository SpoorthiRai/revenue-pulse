import React, { createContext, useContext, useState, useMemo } from 'react';
import { getMonday, getSunday } from '@/lib/formatters';

interface WeekContextType {
  weekStart: Date;
  weekEnd: Date;
  setWeekStart: (d: Date) => void;
  rangeMode: string;
  setRangeMode: (m: string) => void;
}

const WeekContext = createContext<WeekContextType>(null!);

export function useWeek() { return useContext(WeekContext); }

export function WeekProvider({ children }: { children: React.ReactNode }) {
  const defaultMonday = getMonday(new Date('2025-10-06')); // Use a date that has data
  const [weekStart, setWeekStart] = useState(defaultMonday);
  const [rangeMode, setRangeMode] = useState('week');

  const weekEnd = useMemo(() => getSunday(weekStart), [weekStart]);

  return (
    <WeekContext.Provider value={{ weekStart, weekEnd, setWeekStart, rangeMode, setRangeMode }}>
      {children}
    </WeekContext.Provider>
  );
}
