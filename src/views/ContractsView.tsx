import { useMemo, useState } from 'react';
import { useData } from '@/context/DataContext';
import { usePillarFilter } from '@/context/PillarFilterContext';
import { useWeek } from '@/context/WeekContext';
import { KPICard } from '@/components/KPICard';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCurrencyShort, formatCurrency } from '@/lib/formatters';
import { FileText, DollarSign, Calendar, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

const TIMELINE_COLORS = [
  '#0D9488', '#3B82F6', '#8B5CF6', '#EF4444', '#F59E0B', '#10B981',
  '#EC4899', '#6366F1', '#14B8A6', '#F97316', '#06B6D4', '#84CC16',
  '#A855F7', '#E11D48', '#0EA5E9', '#D946EF', '#22C55E', '#FB923C',
];

const CATEGORY_COLORS: Record<string, string> = {
  'Consulting': '#0D9488', 'Software Dev': '#3B82F6', 'Marketing': '#8B5CF6',
  'Cybersecurity': '#EF4444', 'Finance': '#F59E0B', 'PreSales': '#10B981',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: '10px 14px' }}>
      <p style={{ fontSize: '12px', fontWeight: 500, color: '#0F172A', marginBottom: '4px' }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color, fontSize: '12px', display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
          <span style={{ color: '#6B7280' }}>{p.name}:</span>
          <span style={{ fontWeight: 500 }}>{typeof p.value === 'number' && p.value > 100 ? formatCurrency(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

function TimelineTooltip({ po, style }: { po: any; style: React.CSSProperties }) {
  const barStart = po._barStart || po.startDate || po.poDate;
  const barEnd = po._barEnd || po.endDate || po.expiryDate;
  const hasNoBar = po._hasNoBar;
  const startFormatted = barStart ? new Date(barStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
  const endFormatted = barEnd ? new Date(barEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
  const durationText = hasNoBar ? 'Dates not specified — no timeline available' : (startFormatted && endFormatted ? `Start: ${startFormatted} → End: ${endFormatted}` : 'Dates not specified');
  const expiryFormatted = po.expiryDate ? new Date(po.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

  return (
    <div style={{ ...style, background: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: '10px 14px', fontSize: '12px', zIndex: 50 }}>
      <p style={{ fontWeight: 500, color: '#0F172A', marginBottom: '4px' }}>PO: {po.poNumber || '—'}</p>
      <p style={{ color: '#374151' }}>{po.customer}</p>
      <p style={{ color: '#6B7280' }}>{durationText}</p>
      <p style={{ color: '#6B7280' }}>Total Value: {formatCurrency(po.totalValue)}</p>
      <p style={{ color: '#6B7280' }}>Expiry: {expiryFormatted}</p>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '12px',
  border: '1px solid hsl(220 13% 95%)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  padding: '20px 24px',
};

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  letterSpacing: '0.01em',
  color: '#0F172A',
  marginBottom: '16px',
};

const chartGridColor = '#F3F4F6';

export function ContractsView() {
  const { poData: RAW_PO } = useData();
  const { weekStart, weekEnd } = useWeek();
  const { selectedPillar } = usePillarFilter();
  const end = weekEnd;

  const PO_DATA = selectedPillar ? RAW_PO.filter(p => p.serviceCategory === selectedPillar) : RAW_PO;

  const [expandedPO, setExpandedPO] = useState<string | null>(null);
  const [hoveredPO, setHoveredPO] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const activePOs = PO_DATA.filter(p => p.status === 'Active');
  const totalCV = PO_DATA.reduce((s, p) => s + p.totalValue, 0);
  const avgMonthly = PO_DATA.length > 0 ? PO_DATA.reduce((s, p) => s + p.monthlyBilling, 0) / PO_DATA.length : 0;
  const avgDuration = PO_DATA.length > 0 ? PO_DATA.reduce((s, p) => s + p.duration, 0) / PO_DATA.length : 0;

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    PO_DATA.forEach(p => { map[p.serviceCategory] = (map[p.serviceCategory] || 0) + p.totalValue; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [PO_DATA]);

  const companyColorMap = useMemo(() => {
    const companies = [...new Set(PO_DATA.map(p => p.customer))];
    const map: Record<string, string> = {};
    companies.forEach((c, i) => { map[c] = TIMELINE_COLORS[i % TIMELINE_COLORS.length]; });
    return map;
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
        <KPICard title="Active POs" value={String(activePOs.length)} icon={<FileText className="h-5 w-5" />} />
        <KPICard title="Total Contract Value" value={formatCurrencyShort(totalCV)} icon={<DollarSign className="h-5 w-5" />} />
        <KPICard title="Avg Monthly Billing" value={formatCurrencyShort(avgMonthly)} icon={<Calendar className="h-5 w-5" />} />
        <KPICard title="Avg Duration" value={`${avgDuration.toFixed(1)} months`} icon={<Clock className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div style={cardStyle}>
          <h3 style={sectionHeadingStyle}>Contract Value by Category</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
              <XAxis dataKey="name" fontSize={11} tick={{ fill: '#9CA3AF' }} />
              <YAxis fontSize={11} tick={{ fill: '#9CA3AF' }} tickFormatter={v => formatCurrencyShort(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {categoryData.map((d, i) => <Cell key={i} fill={CATEGORY_COLORS[d.name] || '#64748B'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ ...cardStyle, position: 'relative' }}>
          <h3 style={sectionHeadingStyle}>PO Timeline</h3>
          {/* X axis labels */}
          <div className="flex justify-between mb-2" style={{ fontSize: '11px', color: '#9CA3AF', borderBottom: '1px solid #E5E7EB', paddingBottom: '8px' }}>
            <span>Apr '25</span><span>Jul '25</span><span>Oct '25</span><span>Jan '26</span><span>Apr '26</span>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
            <div style={{ minHeight: `${PO_DATA.length * 40}px` }} className="space-y-1">
              {PO_DATA.map((po, idx) => {
                const barStartDate = po.startDate || po.poDate;
                const barEndDate = po.endDate || po.expiryDate;
                const hasNoBar = !barStartDate || !barEndDate;

                const startMs = barStartDate ? new Date(barStartDate).getTime() : timelineStart.getTime();
                let endMs = barEndDate ? new Date(barEndDate).getTime() : startMs;

                const start = Math.max(0, (startMs - timelineStart.getTime()) / 86400000);
                const dur = Math.max(1, (endMs - startMs) / 86400000);
                const leftPct = (start / totalDays) * 100;
                const widthPct = Math.max(2, (dur / totalDays) * 100);
                const barColor = companyColorMap[po.customer] || '#64748B';
                const isWide = !hasNoBar && widthPct > 15;

                const yLabel = po.poNumber && po.poNumber !== '-' && !po.poNumber.startsWith('PO-') ? po.poNumber : po.customer;

                const enrichedPo = { ...po, _barStart: barStartDate, _barEnd: barEndDate, _hasNoBar: hasNoBar };

                return (
                  <div
                    key={`${po.poNumber}-${idx}`}
                    className="flex items-center gap-2 relative"
                    style={{ minHeight: '40px' }}
                    onMouseEnter={(e) => { setHoveredPO(po.poNumber); setTooltipPos({ x: e.clientX, y: e.clientY }); }}
                    onMouseLeave={() => setHoveredPO(null)}
                  >
                    <div className="w-24 shrink-0 font-medium truncate text-right pr-1" style={{ fontSize: '10px', color: '#6B7280' }}>{yLabel}</div>
                    <div className="flex-1 rounded relative" style={{ height: '28px', backgroundColor: hasNoBar ? '#FAFAFA' : '#F1F5F9' }}>
                      {hasNoBar && (
                        <div className="absolute top-1/2 left-0 right-0" style={{ borderTop: '1px dashed #E5E7EB', transform: 'translateY(-50%)' }} />
                      )}
                      {!hasNoBar && (
                        <>
                          <div
                            className="absolute h-full flex items-center overflow-visible font-medium"
                            style={{
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                              backgroundColor: barColor,
                              borderRadius: '4px',
                            }}
                          >
                            {isWide ? (
                              <span style={{ fontSize: '11px', color: 'white', fontWeight: 500, paddingLeft: '6px' }} className="truncate w-full">{po.customer}</span>
                            ) : null}
                          </div>
                          {!isWide && (
                            <span
                              className="absolute font-medium whitespace-nowrap"
                              style={{ left: `${leftPct + widthPct + 0.5}%`, top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: '#374151' }}
                            >
                              {po.customer}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    {hoveredPO === po.poNumber && (
                      <TimelineTooltip po={enrichedPo} style={{ position: 'fixed', left: tooltipPos.x + 12, top: tooltipPos.y - 60 }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <table className="w-full table-zebra">
          <thead>
            <tr>
              <th className="text-left px-4 py-3" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280' }}>PO #</th>
              <th className="text-left px-4 py-3" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280' }}>Customer</th>
              <th className="text-left px-4 py-3" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280' }}>Category</th>
              <th className="text-right px-4 py-3" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280' }}>Total Value</th>
              <th className="text-right px-4 py-3" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280' }}>Monthly</th>
              <th className="text-left px-4 py-3" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280' }}>Terms</th>
              <th className="text-left px-4 py-3" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280' }}>Start</th>
              <th className="text-left px-4 py-3" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280' }}>End</th>
              <th className="text-left px-4 py-3" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {PO_DATA.map(po => (
              <>
                <tr
                  key={po.poNumber}
                  className={`cursor-pointer ${isExpiringSoon(po.endDate) ? 'bg-warning/10' : ''}`}
                  onClick={() => setExpandedPO(expandedPO === po.poNumber ? null : po.poNumber)}
                >
                  <td className="px-4 py-2.5 font-mono" style={{ fontSize: '12px' }}>{po.poNumber}</td>
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
                  <tr key={`${po.poNumber}-exp`} style={{ backgroundColor: '#F0FDFA' }}>
                    <td colSpan={9} className="px-8 py-3" style={{ fontSize: '12px', color: '#6B7280' }}>
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
