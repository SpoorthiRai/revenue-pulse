import { useWeek } from '@/context/WeekContext';
import { getMonday, formatDateShort } from '@/lib/formatters';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const VIEW_TITLES: Record<string, string> = {
  executive: 'Executive Summary',
  pipeline: 'Pipeline',
  contracts: 'PO & Contracts',
  invoicing: 'Invoicing',
  payments: 'Payments & Collections',
  team: 'Team Performance',
};

export function AppHeader({ activeView }: { activeView: string }) {
  const { weekStart, setWeekStart, rangeMode, setRangeMode } = useWeek();

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
    setRangeMode('week');
  };
  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
    setRangeMode('week');
  };

  const setPreset = (mode: string) => {
    const now = new Date('2025-10-07');
    if (mode === 'week') {
      const m = getMonday(now);
      m.setDate(m.getDate() - 7);
      setWeekStart(m);
    } else if (mode === 'month') {
      const m = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      setWeekStart(getMonday(m));
    } else if (mode === 'quarter') {
      const m = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      setWeekStart(getMonday(m));
    } else if (mode === 'all') {
      setWeekStart(new Date('2025-01-01'));
    }
    setRangeMode(mode);
  };

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + (rangeMode === 'week' ? 6 : rangeMode === 'month' ? 30 : rangeMode === 'quarter' ? 90 : 365));

  return (
    <header className="h-16 bg-card border-b flex items-center justify-between px-6 sticky top-0 z-40">
      <h2 className="text-lg font-semibold text-foreground">{VIEW_TITLES[activeView]}</h2>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {[
            { key: 'week', label: 'Last Week' },
            { key: 'month', label: 'Last Month' },
            { key: 'quarter', label: 'Last Quarter' },
            { key: 'all', label: 'All Time' },
          ].map(b => (
            <button
              key={b.key}
              onClick={() => setPreset(b.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                rangeMode === b.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevWeek}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-medium min-w-[180px] text-center">
            {formatDateShort(weekStart)} – {formatDateShort(weekEnd)}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextWeek}><ChevronRight className="h-4 w-4" /></Button>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>Updated just now</span>
        </div>
      </div>
    </header>
  );
}
