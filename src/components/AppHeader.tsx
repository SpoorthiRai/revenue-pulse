import { useWeek } from '@/context/WeekContext';
import { getMonday, formatDateShort } from '@/lib/formatters';
import { CalendarIcon, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const VIEW_TITLES: Record<string, string> = {
  executive: 'Executive Summary',
  pipeline: 'Pipeline',
  contracts: 'PO & Contracts',
  invoicing: 'Invoicing',
  payments: 'Payments & Collections',
  team: 'Team Performance',
};

export function AppHeader({ activeView }: { activeView: string }) {
  const { weekStart, weekEnd, setWeekStart, setWeekEnd, setRangeMode } = useWeek();

  const setPreset = (mode: string) => {
    const now = new Date('2025-10-07');
    let start: Date;
    let end = new Date(now);
    if (mode === 'week') {
      start = getMonday(now);
      start.setDate(start.getDate() - 7);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
    } else if (mode === 'month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (mode === 'quarter') {
      start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      end = new Date(now);
    } else {
      start = new Date('2025-01-01');
      end = new Date('2025-12-31');
    }
    setWeekStart(start);
    setWeekEnd(end);
    setRangeMode(mode);
  };

  const handleFromSelect = (date: Date | undefined) => {
    if (date) {
      setWeekStart(date);
      setRangeMode('custom');
    }
  };

  const handleToSelect = (date: Date | undefined) => {
    if (date) {
      setWeekEnd(date);
      setRangeMode('custom');
    }
  };

  return (
    <header className="h-16 bg-card border-b flex items-center justify-between px-6 sticky top-0 z-40">
      <h2 className="text-lg font-semibold text-foreground">{VIEW_TITLES[activeView]}</h2>

      <div className="flex items-center gap-3">
        {/* Preset buttons */}
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
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                b.key === 'custom' ? '' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* Date range pickers */}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5" />
                {format(weekStart, 'dd MMM yyyy')}
              </Button>
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

          <span className="text-xs text-muted-foreground">to</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5" />
                {format(weekEnd, 'dd MMM yyyy')}
              </Button>
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

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>Updated just now</span>
        </div>
      </div>
    </header>
  );
}
