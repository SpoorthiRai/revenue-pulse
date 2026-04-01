import { useMemo, useState } from 'react';
import { useData } from '@/context/DataContext';
import { usePillarFilter } from '@/context/PillarFilterContext';
import { useWeek } from '@/context/WeekContext';
import { KPICard } from '@/components/KPICard';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { formatCurrencyShort, formatCurrency, isInRange } from '@/lib/formatters';
import { Users, CheckCircle, TrendingUp, DollarSign, ArrowUpDown } from 'lucide-react';
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

  const filteredLeads = useMemo(() => {
    let data = [...ENQUIRY_DATA];
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
  }, [pillarFilter, statusFilter, assignedFilter, search, sortCol, sortDir, ENQUIRY_DATA]);

  const weekLeads = ENQUIRY_DATA.filter(e => isInRange(e.createdDate, weekStart, end));
  const converted = weekLeads.filter(e => e.status === 'Converted').length;
  const weekDeals = DEAL_DATA.filter(d => isInRange(d.closeDate, weekStart, end));
  const wonDeals = weekDeals.filter(d => d.stage === 'Win');
  const decided = weekDeals.filter(d => ['Win', 'Lost', 'Cancel'].includes(d.stage));
  const winRate = decided.length > 0 ? (wonDeals.length / decided.length) * 100 : 0;
  const pipelineValue = wonDeals.reduce((s, d) => s + d.negotiatedAmount, 0);

  const sourceData = useMemo(() => {
    const map: Record<string, number> = {};
    ENQUIRY_DATA.forEach(e => { map[e.source] = (map[e.source] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [ENQUIRY_DATA]);

  const stageData = useMemo(() => {
    const map: Record<string, number> = {};
    DEAL_DATA.forEach(d => { map[d.stage] = (map[d.stage] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [DEAL_DATA]);

  const comparisonData = useMemo(() => {
    return DEAL_DATA.slice(0, 15).map(d => ({
      name: d.company.length > 15 ? d.company.slice(0, 15) + '…' : d.company,
      Expected: d.expectedAmount,
      Negotiated: d.negotiatedAmount,
    }));
  }, [DEAL_DATA]);

  const pillars = [...new Set(ENQUIRY_DATA.map(e => e.pillar))];
  const statuses = [...new Set(ENQUIRY_DATA.map(e => e.status))];
  const assignees = [...new Set(ENQUIRY_DATA.map(e => e.assignedTo))];

  const clearFilters = () => { setPillarFilter(''); setStatusFilter(''); setAssignedFilter(''); setSearch(''); };
  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <KPICard title="Total Leads" value={String(weekLeads.length)} icon={<Users className="h-5 w-5 text-primary" />} />
        <KPICard title="Converted" value={String(converted)} icon={<CheckCircle className="h-5 w-5 text-success" />} />
        <KPICard title="Win Rate" value={`${winRate.toFixed(0)}%`} icon={<TrendingUp className="h-5 w-5 text-primary" />} />
        <KPICard title="Pipeline Value" value={formatCurrencyShort(pipelineValue)} icon={<DollarSign className="h-5 w-5 text-success" />} />
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
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Expected" fill="#94A3B8" radius={[0, 2, 2, 0]} />
              <Bar dataKey="Negotiated" fill="#0D9488" radius={[0, 2, 2, 0]} />
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
