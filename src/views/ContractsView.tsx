import { useMemo, useState } from 'react';
import { useData } from '@/context/DataContext';
import { usePillarFilter } from '@/context/PillarFilterContext';
import { useWeek } from '@/context/WeekContext';
import { KPICard } from '@/components/KPICard';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCurrencyShort, formatCurrency } from '@/lib/formatters';
import { FileText, DollarSign, Calendar, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

const CATEGORY_COLORS: Record<string, string> = {
  'Consulting': '#0D9488', 'Software Dev': '#3B82F6', 'Marketing': '#8B5CF6',
  'Cybersecurity': '#EF4444', 'Finance': '#F59E0B', 'PreSales': '#10B981',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="flex justify-between gap-4">
          <span>{p.name}:</span>
          <span className="font-medium">{typeof p.value === 'number' && p.value > 100 ? formatCurrency(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

export function ContractsView() {
  const { poData: PO_DATA } = useData();
  const { weekStart, weekEnd } = useWeek();
  const end = weekEnd;

  const [expandedPO, setExpandedPO] = useState<string | null>(null);

  const activePOs = PO_DATA.filter(p => p.status === 'Active');
  const totalCV = PO_DATA.reduce((s, p) => s + p.totalValue, 0);
  const avgMonthly = PO_DATA.length > 0 ? PO_DATA.reduce((s, p) => s + p.monthlyBilling, 0) / PO_DATA.length : 0;
  const avgDuration = PO_DATA.length > 0 ? PO_DATA.reduce((s, p) => s + p.duration, 0) / PO_DATA.length : 0;

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    PO_DATA.forEach(p => { map[p.serviceCategory] = (map[p.serviceCategory] || 0) + p.totalValue; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [PO_DATA]);

  const timelineStart = new Date('2025-04-01');
  const timelineEnd = new Date('2026-07-01');
  const totalDays = (timelineEnd.getTime() - timelineStart.getTime()) / 86400000;

  const now = new Date('2025-10-07');
  const isExpiringSoon = (endDate: string) => {
    const d = new Date(endDate);
    const diff = (d.getTime() - now.getTime()) / 86400000;
    return diff > 0 && diff <= 30;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <KPICard title="Active POs" value={String(activePOs.length)} icon={<FileText className="h-5 w-5 text-primary" />} />
        <KPICard title="Total Contract Value" value={formatCurrencyShort(totalCV)} icon={<DollarSign className="h-5 w-5 text-success" />} />
        <KPICard title="Avg Monthly Billing" value={formatCurrencyShort(avgMonthly)} icon={<Calendar className="h-5 w-5 text-primary" />} />
        <KPICard title="Avg Duration" value={`${avgDuration.toFixed(1)} months`} icon={<Clock className="h-5 w-5 text-muted-foreground" />} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">Contract Value by Category</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={v => formatCurrencyShort(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {categoryData.map((d, i) => <Cell key={i} fill={CATEGORY_COLORS[d.name] || '#64748B'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">PO Timeline</h3>
          <div className="space-y-2">
            {PO_DATA.map(po => {
              const start = Math.max(0, (new Date(po.startDate).getTime() - timelineStart.getTime()) / 86400000);
              const dur = (new Date(po.endDate).getTime() - new Date(po.startDate).getTime()) / 86400000;
              const leftPct = (start / totalDays) * 100;
              const widthPct = Math.max(2, (dur / totalDays) * 100);
              return (
                <div key={po.poNumber} className="flex items-center gap-2">
                  <span className="text-xs w-20 truncate text-muted-foreground">{po.poNumber}</span>
                  <div className="flex-1 h-6 bg-muted rounded relative">
                    <div
                      className="absolute h-full rounded text-[9px] flex items-center justify-center overflow-hidden font-medium"
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        backgroundColor: CATEGORY_COLORS[po.serviceCategory] || '#64748B',
                        color: '#fff',
                      }}
                      title={`${po.customer}: ${po.startDate} to ${po.endDate}`}
                    >
                      {po.customer.split(' ')[0]}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
            <span>Apr '25</span><span>Jul '25</span><span>Oct '25</span><span>Jan '26</span><span>Apr '26</span>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border overflow-x-auto">
        <table className="w-full text-sm table-zebra">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">PO #</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Category</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Total Value</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Monthly</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Terms</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Start</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">End</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {PO_DATA.map(po => (
              <>
                <tr
                  key={po.poNumber}
                  className={`border-b cursor-pointer ${isExpiringSoon(po.endDate) ? 'bg-warning/10' : ''}`}
                  onClick={() => setExpandedPO(expandedPO === po.poNumber ? null : po.poNumber)}
                >
                  <td className="px-4 py-2.5 font-mono text-xs">{po.poNumber}</td>
                  <td className="px-4 py-2.5 font-medium">{po.customer}</td>
                  <td className="px-4 py-2.5">{po.serviceCategory}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(po.totalValue)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(po.monthlyBilling)}</td>
                  <td className="px-4 py-2.5">{po.billingTerms}</td>
                  <td className="px-4 py-2.5">{po.startDate}</td>
                  <td className="px-4 py-2.5">{po.endDate}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={po.status} /></td>
                </tr>
                {expandedPO === po.poNumber && (
                  <tr key={`${po.poNumber}-exp`} className="bg-accent/30">
                    <td colSpan={9} className="px-8 py-3 text-xs text-muted-foreground">
                      <strong>Milestones:</strong> {po.milestones} &nbsp;|&nbsp;
                      <strong>Advance:</strong> {po.advancePercent}% &nbsp;|&nbsp;
                      <strong>Duration:</strong> {po.duration} months
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
