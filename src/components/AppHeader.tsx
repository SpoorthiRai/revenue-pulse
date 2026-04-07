import { useWeek } from '@/context/WeekContext';
import { useData } from '@/context/DataContext';
import { getMonday, formatDateShort } from '@/lib/formatters';
import { CalendarIcon, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useState } from 'react';

const VIEW_TITLES: Record<string, string> = {
  executive: 'Executive Summary',
  pipeline: 'Pipeline',
  contracts: 'PO & Contracts',
  invoicing: 'Invoicing',
  payments: 'Payments & Collections',
  team: 'Team Performance',
};

export function AppHeader({ activeView }: { activeView: string }) {
  const { weekStart, weekEnd, setWeekStart, setWeekEnd, setRangeMode, rangeMode } = useWeek();
  const { refreshData, isLoading } = useData();
  const [activePreset, setActivePreset] = useState(rangeMode || '');

  const setPreset = (mode: string) => {
    const now = new Date('2025-10-07');
    let start: Date;
    let end: Date;
    if (mode === 'week') {
      start = getMonday(now);
      start.setDate(start.getDate() - 7);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
    } else if (mode === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (mode === 'quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), currentQuarter * 3, 1);
      end = new Date(now.getFullYear(), currentQuarter * 3 + 3, 0);
    } else if (mode === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now);
    } else {
      start = new Date('2025-01-01');
      end = new Date('2025-12-31');
    }
    setWeekStart(start);
    setWeekEnd(end);
    setRangeMode(mode);
    setActivePreset(mode);
  };

  const handleFromSelect = (date: Date | undefined) => {
    if (date) {
      setWeekStart(date);
      setRangeMode('custom');
      setActivePreset('');
    }
  };

  const handleToSelect = (date: Date | undefined) => {
    if (date) {
      setWeekEnd(date);
      setRangeMode('custom');
      setActivePreset('');
    }
  };

  return (
    <header className="h-16 bg-card flex items-center justify-between px-6 sticky top-0 z-40" style={{ borderBottom: '1px solid hsl(220 13% 95%)' }}>
      <h2 className="font-medium" style={{ fontSize: '20px', color: '#0F172A' }}>{VIEW_TITLES[activeView]}</h2>

      <div className="flex items-center gap-3">
        {/* Refresh Data button */}
        <button
          onClick={refreshData}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors duration-150"
          style={{
            border: '0.5px solid #14B8A6',
            color: '#14B8A6',
            borderRadius: '6px',
            background: 'transparent',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F0FDFA'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} style={{ color: '#14B8A6' }} />
          Refresh Data
        </button>

        {/* Preset buttons */}
        <div className="flex items-center gap-1">
          {[
            { key: 'week', label: 'Last Week' },
            { key: 'month', label: 'This Month' },
            { key: 'quarter', label: 'This Quarter' },
            { key: 'year', label: 'This Year' },
            { key: 'all', label: 'All Time' },
          ].map(b => (
            <button
              key={b.key}
              onClick={() => setPreset(b.key)}
              className="text-xs font-medium transition-colors duration-150"
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                backgroundColor: activePreset === b.key ? '#0F172A' : 'transparent',
                color: activePreset === b.key ? '#FFFFFF' : '#6B7280',
                border: activePreset === b.key ? 'none' : '0.5px solid #D1D5DB',
              }}
              onMouseEnter={e => {
                if (activePreset !== b.key) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F1F5F9';
              }}
              onMouseLeave={e => {
                if (activePreset !== b.key) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              }}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* Date range pickers */}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-1.5 text-xs"
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '0.5px solid #D1D5DB',
                  backgroundColor: 'white',
                  color: '#374151',
                }}
              >
                <CalendarIcon className="h-3.5 w-3.5" style={{ color: '#9CA3AF' }} />
                {format(weekStart, 'dd MMM yyyy')}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={weekStart}
                onSelect={handleFromSelect}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          <span className="text-xs" style={{ color: '#9CA3AF' }}>to</span>

          <Popover>
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-1.5 text-xs"
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '0.5px solid #D1D5DB',
                  backgroundColor: 'white',
                  color: '#374151',
                }}
              >
                <CalendarIcon className="h-3.5 w-3.5" style={{ color: '#9CA3AF' }} />
                {format(weekEnd, 'dd MMM yyyy')}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={weekEnd}
                onSelect={handleToSelect}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-1.5" style={{ fontSize: '10px', color: '#9CA3AF', fontStyle: 'italic' }}>
          <Clock className="h-3.5 w-3.5" />
          <span>Updated just now</span>
        </div>
      </div>
    </header>
  );
}
