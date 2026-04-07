import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  previousValue?: string;
  change?: { value: number; direction: 'up' | 'down' | 'flat' | 'no_prior' };
  icon?: React.ReactNode;
  positive?: boolean;
}

export function KPICard({ title, value, previousValue, change, icon, positive = true }: KPICardProps) {
  const isGood = change ? (positive ? change.direction === 'up' : change.direction === 'down') : true;

  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between">
        <div>
          <p style={{ fontSize: '11px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280' }}>{title}</p>
          <p style={{ fontSize: '28px', fontWeight: 600, color: '#0F172A' }} className="mt-1">{value}</p>
        </div>
        {icon && <div className="p-2 rounded-lg" style={{ color: '#D1D5DB' }}>{icon}</div>}
      </div>
      {change && (
        <div className="mt-3 flex items-center gap-2">
          {change.direction === 'no_prior' ? (
            <span style={{ fontSize: '11px', color: '#6B7280' }}>No prior data</span>
          ) : (
            <>
              <span className={`flex items-center gap-0.5 text-xs font-medium ${
                change.direction === 'flat' ? 'text-muted-foreground' :
                isGood ? 'text-success' : 'text-destructive'
              }`}>
                {change.direction === 'up' && <TrendingUp className="h-3.5 w-3.5" />}
                {change.direction === 'down' && <TrendingDown className="h-3.5 w-3.5" />}
                {change.direction === 'flat' && <Minus className="h-3.5 w-3.5" />}
                {change.value.toFixed(1)}%
              </span>
              {previousValue && <span style={{ fontSize: '11px', color: '#9CA3AF' }}>vs {previousValue}</span>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
