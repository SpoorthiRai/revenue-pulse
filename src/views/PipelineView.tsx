import { useMemo, useState } from 'react';
import { useData } from '@/context/DataContext';
import { usePillarFilter } from '@/context/PillarFilterContext';
import { useWeek } from '@/context/WeekContext';
import { KPICard } from '@/components/KPICard';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { formatCurrencyShort, formatCurrency, isInRange, percentChange } from '@/lib/formatters';
import { Users, FileText, TrendingUp, TrendingDown, DollarSign, ArrowUpDown, Lightbulb, Minus } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, Legend
} from 'recharts';

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

const STAGE_COLORS: Record<string, string> = { Win: '#10B981', Negotiation: '#F59E0B', Cancel: '#EF4444', Lost: '#9CA3AF' };

// Change 7: Total Deals stages
const TOTAL_DEALS_STAGES = new Set([
  'Converted', 'Commercial Proposal', 'Negotiation', 'Win', 'Lost', 'Cancel', 'Closed'
]);

export function PipelineView() {
  const { enquiryData: RAW_ENQUIRY, dealData: RAW_DEALS } = useData();
  const { weekStart, weekEnd } = useWeek();
  const { selectedPillar } = usePillarFilter();
  const end = weekEnd;

  const ENQUIRY_DATA = selectedPillar ? RAW_ENQUIRY.filter(e => e.pillar === selectedPillar) : RAW_ENQUIRY;
  const DEAL_DATA = selectedPillar ? RAW_DEALS.filter(d => d.pillar === selectedPillar) : RAW_DEALS;

  const [pillarFilter, setPillarFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<string>('leadNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Change 8: filter leads by createdDate, deals by createdDealDate or updatedAt
  const filteredLeads = useMemo(() => {
    let data = ENQUIRY_DATA.filter(e => isInRange(e.createdDate, weekStart, end));
    if (pillarFilter) data = data.filter(d => d.pillar === pillarFilter);
    if (statusFilter) data = data.filter(d => d.status === statusFilter);
    if (assignedFilter) data = data.filter(d => d.assignedTo === assignedFilter);
    if (search) data = data.filter(d => d.company.toLowerCase().includes(search.toLowerCase()) || d.leadNumber.toLowerCase().includes(search.toLowerCase()));
    data.sort((a, b) => {
      const av = (a as any)[sortCol];
      const bv = (b as any)[sortCol];
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return data;
  }, [pillarFilter, statusFilter, assignedFilter, search, sortCol, sortDir, ENQUIRY_DATA, weekStart, end]);

  // Change 8: Deals filtered by createdDealDate OR updatedAt within range
  const weekLeads = ENQUIRY_DATA.filter(e => isInRange(e.createdDate, weekStart, end));
  const weekDeals = DEAL_DATA.filter(d => isInRange(d.createdDealDate, weekStart, end) || isInRange(d.updatedAt, weekStart, end));

  // Change 10: All Time KPI cards — no date filter
  const allTimeLeadsCount = ENQUIRY_DATA.length;
  const allTimeTotalDeals = DEAL_DATA.filter(d => TOTAL_DEALS_STAGES.has(d.stage)).length; // Change 7
  const allTimeWonDeals = DEAL_DATA.filter(d => d.stage === 'Win');
  const allTimeDecided = DEAL_DATA.filter(d => TOTAL_DEALS_STAGES.has(d.stage) && ['Win', 'Lost', 'Cancel', 'Closed'].includes(d.stage));
  const allTimeWinRate = allTimeDecided.length > 0 ? (allTimeWonDeals.length / allTimeDecided.length) * 100 : 0;
  const openStages = ['Commercial Proposal', 'Negotiation', 'Assign', 'First Contact', 'Discovery Meeting'];
  // Change 1: use expectedAmount
  const allTimePipelineValue = DEAL_DATA.filter(d => openStages.includes(d.stage)).reduce((s, d) => s + d.expectedAmount, 0);
  const allTimeHasActivePipeline = DEAL_DATA.some(d => openStages.includes(d.stage));

  const wonDeals = weekDeals.filter(d => d.stage === 'Win');

  // Date-filtered data for charts
  const dateFilteredLeads = ENQUIRY_DATA.filter(e => isInRange(e.createdDate, weekStart, end));
  const dateFilteredDeals = DEAL_DATA.filter(d => isInRange(d.createdDealDate, weekStart, end) || isInRange(d.updatedAt, weekStart, end));

  const sourceData = useMemo(() => {
    const map: Record<string, number> = {};
    dateFilteredLeads.forEach(e => { map[e.source] = (map[e.source] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [dateFilteredLeads]);

  const stageData = useMemo(() => {
    const map: Record<string, number> = {};
    dateFilteredDeals.forEach(d => { map[d.stage] = (map[d.stage] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [dateFilteredDeals]);

  const comparisonData = useMemo(() => {
    return dateFilteredDeals.slice(0, 15).map(d => ({
      name: d.company.length > 15 ? d.company.slice(0, 15) + '…' : d.company,
      'Expected': d.expectedAmount,
      'Negotiated': d.negotiatedAmount,
    }));
  }, [dateFilteredDeals]);

  const pillars = [...new Set(ENQUIRY_DATA.map(e => e.pillar))];
  const statuses = [...new Set(ENQUIRY_DATA.map(e => e.status))];
  const assignees = [...new Set(ENQUIRY_DATA.map(e => e.assignedTo))];

  const clearFilters = () => { setPillarFilter(''); setStatusFilter(''); setAssignedFilter(''); setSearch(''); };
  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  // Previous period for pipeline strip
  const diff = end.getTime() - weekStart.getTime();
  const prevStart = new Date(weekStart.getTime() - diff);
  const prevEnd = new Date(weekStart.getTime() - 1);
  const prevLeads = ENQUIRY_DATA.filter(e => isInRange(e.createdDate, prevStart, prevEnd));
  const prevDeals = DEAL_DATA.filter(d => isInRange(d.createdDealDate, prevStart, prevEnd) || isInRange(d.updatedAt, prevStart, prevEnd));
  const prevWonDeals = prevDeals.filter(d => d.stage === 'Win');

  return (
    <div className="space-y-6">
      {/* Deal Pipeline Flow */}
      {(() => {
        const convertedCount = weekLeads.filter(e => e.status === 'Converted').length;
        const prevConverted = prevLeads.filter(e => e.status === 'Converted').length;
        const lostDeals = weekDeals.filter(d => d.stage === 'Lost');
        const prevLostDeals = prevDeals.filter(d => d.stage === 'Lost');
        const cancelDeals = weekDeals.filter(d => d.stage === 'Cancel');
        const prevCancelDeals = prevDeals.filter(d => d.stage === 'Cancel');
        const negDeals = weekDeals.filter(d => d.stage === 'Negotiation');
        const prevNegDeals = prevDeals.filter(d => d.stage === 'Negotiation');
        const proposalDeals = weekDeals.filter(d => d.stage === 'Commercial Proposal');
        const prevProposalDeals = prevDeals.filter(d => d.stage === 'Commercial Proposal');
        const closedDeals = weekDeals.filter(d => d.stage === 'Closed');
        const prevClosedDeals = prevDeals.filter(d => d.stage === 'Closed');

        // Change 7: Total Deals uses TOTAL_DEALS_STAGES
        const totalDealsCount = weekDeals.filter(d => TOTAL_DEALS_STAGES.has(d.stage)).length;
        const prevTotalDealsCount = prevDeals.filter(d => TOTAL_DEALS_STAGES.has(d.stage)).length;

        const stages = [
          { name: 'Total Leads', current: weekLeads.length, prev: prevLeads.length, positive: true, color: 'hsl(174,83%,32%)' },
          { name: 'Converted', current: convertedCount, prev: prevConverted, positive: true, color: 'hsl(160,84%,39%)' },
          { name: 'Total Deals', current: totalDealsCount, prev: prevTotalDealsCount, positive: true, color: 'hsl(38,92%,50%)' },
          { name: 'Proposal', current: proposalDeals.length, prev: prevProposalDeals.length, positive: true, color: 'hsl(280,70%,55%)' },
          { name: 'Negotiation', current: negDeals.length, prev: prevNegDeals.length, positive: true, color: 'hsl(262,83%,58%)' },
          { name: 'Won', current: wonDeals.length, prev: prevWonDeals.length, positive: true, color: 'hsl(217,91%,60%)' },
          { name: 'Lost', current: lostDeals.length, prev: prevLostDeals.length, positive: false, color: 'hsl(0,84%,60%)' },
          { name: 'Cancelled', current: cancelDeals.length, prev: prevCancelDeals.length, positive: false, color: 'hsl(25,95%,53%)' },
          { name: 'Closed', current: closedDeals.length, prev: prevClosedDeals.length, positive: true, color: 'hsl(200,70%,50%)' },
        ];

        const convRates = stages.slice(0, -1).map((s, i) => {
          const next = stages[i + 1];
          if (s.current === 0) return null;
          return ((next.current / s.current) * 100).toFixed(0);
        });

        const biggestRisk = stages.reduce((worst, s) => {
          const ch = percentChange(s.current, s.prev);
          const isBad = s.positive ? ch.direction === 'down' : ch.direction === 'up';
          if (isBad && ch.value > (worst?.changeVal || 0)) {
            return { name: s.name, changeVal: ch.value, direction: ch.direction, positive: s.positive };
          }
          return worst;
        }, null as { name: string; changeVal: number; direction: string; positive: boolean } | null);

        const insightLine = biggestRisk
          ? `${biggestRisk.name} ${biggestRisk.direction === 'down' ? '↓' : '↑'} ${biggestRisk.changeVal.toFixed(0)}% vs prior period → Requires immediate attention to maintain targets.`
          : 'All pipeline stages are stable or improving vs prior period.';

        return (
          <div className="bg-card rounded-lg border p-4">
            <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Deal Pipeline Flow</h3>
            <div className="flex items-stretch">
              {stages.map((stage, i) => {
                const isInactive = stage.current === 0 && stage.prev === 0;
                const change = percentChange(stage.current, stage.prev);
                const absDelta = stage.current - stage.prev;
                const isGood = change.direction === 'flat' || change.direction === 'no_prior' ? true
                  : stage.positive ? change.direction === 'up' : change.direction === 'down';
                const deltaColor = change.direction === 'flat' || change.direction === 'no_prior' ? 'text-muted-foreground' : isGood ? 'text-success' : 'text-destructive';

                return (
                  <div key={stage.name} className="flex items-stretch flex-1 min-w-0">
                    {i > 0 && (
                      <div className="flex flex-col items-center justify-center px-1 shrink-0">
                        <span className={`text-lg leading-none ${isInactive && stages[i-1].current === 0 && stages[i-1].prev === 0 ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}>→</span>
                        {convRates[i - 1] && (
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">
                            {convRates[i - 1]}%
                          </span>
                        )}
                      </div>
                    )}
                    <div
                      className={`flex-1 rounded-md px-3 py-2.5 min-w-0 border ${isInactive ? 'opacity-40 bg-muted/30' : ''}`}
                      style={{ borderLeftColor: isInactive ? 'hsl(0,0%,70%)' : stage.color, borderLeftWidth: '3px' }}
                    >
                      <p className="text-[10px] text-muted-foreground font-medium truncate uppercase tracking-wide">{stage.name}</p>
                      {isInactive ? (
                        <>
                          <p className="text-lg font-bold text-muted-foreground leading-tight">—</p>
                          <div className="mt-1">
                            <p className="text-[10px] text-muted-foreground">was 0</p>
                            <p className="text-[10px] text-muted-foreground">— (0.0%)</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-lg font-bold text-foreground leading-tight">{stage.current}</p>
                          <div className="mt-1 space-y-0">
                            <p className="text-[10px] text-muted-foreground">was {stage.prev}</p>
                            {change.direction === 'no_prior' ? (
                              <p className="text-[10px] text-muted-foreground">No prior data</p>
                            ) : (
                              <div className={`flex items-center gap-1 text-[10px] font-medium ${deltaColor}`}>
                                {change.direction === 'up' && <TrendingUp className="h-2.5 w-2.5" />}
                                {change.direction === 'down' && <TrendingDown className="h-2.5 w-2.5" />}
                                {change.direction === 'flat' && <Minus className="h-2.5 w-2.5" />}
                                <span>{absDelta >= 0 ? '+' : ''}{absDelta}</span>
                                <span>({change.value.toFixed(1)}%)</span>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
              <Lightbulb className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <span>{insightLine}</span>
            </div>
          </div>
        );
      })()}

      {/* Change 9 & 10: 4 KPI cards — All Time, replace Converted with Total Deals */}
      <div className="grid grid-cols-4 gap-4">
        <div>
          <KPICard title="Total Leads" value={String(allTimeLeadsCount)} icon={<Users className="h-5 w-5 text-primary" />} />
          <p className="text-[10px] text-muted-foreground mt-1 text-center">All time</p>
        </div>
        <div>
          <KPICard title="Total Deals" value={String(allTimeTotalDeals)} icon={<FileText className="h-5 w-5 text-primary" />} />
          <p className="text-[10px] text-muted-foreground mt-1 text-center">All time</p>
        </div>
        <div>
          <KPICard title="Win Rate" value={`${allTimeWinRate.toFixed(0)}%`} icon={<TrendingUp className="h-5 w-5 text-primary" />} />
          <p className="text-[10px] text-muted-foreground mt-1 text-center">All time</p>
        </div>
        <div>
          <KPICard title="Pipeline Value" value={formatCurrencyShort(allTimePipelineValue)} icon={<DollarSign className="h-5 w-5 text-success" />} />
          <p className="text-[10px] text-muted-foreground mt-1 text-center">All time</p>
          {!allTimeHasActivePipeline && <p className="text-xs text-muted-foreground text-center">No active pipeline</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">Leads by Source</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sourceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
              <XAxis type="number" fontSize={11} />
              <YAxis type="category" dataKey="name" width={100} fontSize={11} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#0D9488" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">Deal Stages</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {stageData.map((d, i) => <Cell key={i} fill={STAGE_COLORS[d.name] || '#64748B'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">Expected vs Negotiated</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={comparisonData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
              <XAxis type="number" fontSize={10} tickFormatter={(v) => formatCurrencyShort(v)} />
              <YAxis type="category" dataKey="name" width={100} fontSize={9} />
              <Tooltip content={<CustomTooltip />} />
              <Legend fontSize={11} />
              <Bar dataKey="Expected" fill="hsl(174,83%,52%)" radius={[0, 2, 2, 0]} />
              <Bar dataKey="Negotiated" fill="hsl(174,83%,32%)" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card rounded-lg border">
        <div className="p-4 border-b flex items-center gap-3 flex-wrap">
          <input
            placeholder="Search leads…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-1.5 text-sm border rounded-md bg-background w-48"
          />
          <select value={pillarFilter} onChange={e => setPillarFilter(e.target.value)} className="px-3 py-1.5 text-sm border rounded-md bg-background">
            <option value="">All Pillars</option>
            {pillars.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-1.5 text-sm border rounded-md bg-background">
            <option value="">All Statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={assignedFilter} onChange={e => setAssignedFilter(e.target.value)} className="px-3 py-1.5 text-sm border rounded-md bg-background">
            <option value="">All Reps</option>
            {assignees.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          {filteredLeads.length === 0 ? <EmptyState onClear={clearFilters} /> : (
            <table className="w-full text-sm table-zebra">
              <thead>
                <tr className="border-b bg-muted/50">
                  {['leadNumber', 'company', 'contact', 'pillar', 'subCategory', 'assignedTo', 'source', 'status', 'createdDate'].map(col => (
                    <th key={col} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground" onClick={() => toggleSort(col)}>
                      <span className="flex items-center gap-1">
                        {col.replace(/([A-Z])/g, ' $1').trim()}
                        {sortCol === col && <ArrowUpDown className="h-3 w-3" />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => (
                  <tr key={lead.leadNumber} className="border-b">
                    <td className="px-4 py-2.5 font-mono text-xs">{lead.leadNumber}</td>
                    <td className="px-4 py-2.5 font-medium">{lead.company}</td>
                    <td className="px-4 py-2.5">{lead.contact}</td>
                    <td className="px-4 py-2.5">{lead.pillar}</td>
                    <td className="px-4 py-2.5">{lead.subCategory}</td>
                    <td className="px-4 py-2.5">{lead.assignedTo}</td>
                    <td className="px-4 py-2.5">{lead.source}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={lead.status} /></td>
                    <td className="px-4 py-2.5 text-muted-foreground">{lead.createdDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
