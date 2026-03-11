import { useMemo } from 'react';
import { ENQUIRY_DATA, DEAL_DATA, PO_DATA } from '@/data/constants';
import { useWeek } from '@/context/WeekContext';
import { KPICard } from '@/components/KPICard';
import { formatCurrencyShort, formatCurrency, isInRange, percentChange, getMonday, getSunday } from '@/lib/formatters';
import { TrendingUp, CheckCircle, Activity } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
  FunnelChart, Funnel, LabelList
} from 'recharts';

const COLORS = ['#0D9488', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="flex justify-between gap-4">
          <span>{p.name}:</span>
          <span className="font-medium">{typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

export function ExecutiveSummaryView() {
  const { weekStart, weekEnd } = useWeek();
  const end = weekEnd;

  // Previous period
  const prevStart = new Date(weekStart);
  const diff = end.getTime() - weekStart.getTime();
  prevStart.setTime(weekStart.getTime() - diff);
  const prevEnd = new Date(weekStart);
  prevEnd.setTime(prevEnd.getTime() - 1);

  const weekLeads = ENQUIRY_DATA.filter(e => isInRange(e.createdDate, weekStart, end));
  const prevLeads = ENQUIRY_DATA.filter(e => isInRange(e.createdDate, prevStart, prevEnd));
  const weekDeals = DEAL_DATA.filter(d => isInRange(d.closeDate, weekStart, end));
  const prevDeals = DEAL_DATA.filter(d => isInRange(d.closeDate, prevStart, prevEnd));
  const weekPOs = PO_DATA.filter(p => isInRange(p.startDate, weekStart, end));

  const wonDeals = weekDeals.filter(d => d.stage === 'Win');
  const prevWonDeals = prevDeals.filter(d => d.stage === 'Win');
  const lostCancelled = weekDeals.filter(d => d.stage === 'Lost' || d.stage === 'Cancel');

  // KPI values
  const pipelineValue = wonDeals.reduce((s, d) => s + d.negotiatedAmount, 0);
  const prevPipelineValue = prevWonDeals.reduce((s, d) => s + d.negotiatedAmount, 0);

  const decided = weekDeals.filter(d => ['Win', 'Lost', 'Cancel'].includes(d.stage));
  const winRate = decided.length > 0 ? (wonDeals.length / decided.length) * 100 : 0;
  const prevDecided = prevDeals.filter(d => ['Win', 'Lost', 'Cancel'].includes(d.stage));
  const prevWinRate = prevDecided.length > 0 ? (prevWonDeals.length / prevDecided.length) * 100 : 0;

  // WoW change rate (total deal activity)
  const wowChange = percentChange(weekDeals.length, prevDeals.length);

  const cancelDeals = weekDeals.filter(d => d.stage === 'Cancel');
  const lostDeals = weekDeals.filter(d => d.stage === 'Lost');
  const negotiationDeals = weekDeals.filter(d => d.stage === 'Negotiation');
  const commercialProposalDeals = weekDeals.filter(d => d.stage === 'Commercial Proposal');
  const closedDeals = weekDeals.filter(d => d.stage === 'Closed');

  // Snapshot card data
  const snapshotItems = [
    { label: 'Total Enquiry', value: weekLeads.length },
    { label: 'Total Deals', value: weekDeals.length },
    { label: 'Deals Won', value: wonDeals.length },
    { label: 'Deals Lost', value: lostDeals.length },
    { label: 'Deals Cancel', value: cancelDeals.length },
    { label: 'Commercial Proposal', value: commercialProposalDeals.length },
    { label: 'Deals Negotiation', value: negotiationDeals.length },
    { label: 'Deals Closed', value: closedDeals.length },
  ];

  // Funnel data — filtered by date range, no Invoiced/Paid
  const filteredLeads = ENQUIRY_DATA.filter(e => isInRange(e.createdDate, weekStart, end));
  const filteredConverted = filteredLeads.filter(e => e.status === 'Converted').length;
  const filteredDeals = DEAL_DATA.filter(d => isInRange(d.closeDate, weekStart, end));
  const filteredWon = filteredDeals.filter(d => d.stage === 'Win').length;
  const funnelData = [
    { name: 'Leads', value: filteredLeads.length, fill: '#0D9488' },
    { name: 'Converted', value: filteredConverted, fill: '#10B981' },
    { name: 'Deals', value: filteredDeals.length, fill: '#3B82F6' },
    { name: 'Won', value: filteredWon, fill: '#8B5CF6' },
  ];

  // Leads by pillar donut
  const pillarCounts = useMemo(() => {
    const filtered = ENQUIRY_DATA.filter(e => isInRange(e.createdDate, weekStart, end));
    const map: Record<string, number> = {};
    filtered.forEach(e => { map[e.pillar] = (map[e.pillar] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [weekStart, end]);

  // Trend over time — based on selected date range, split into weekly buckets
  const weeklyActivity = useMemo(() => {
    const weeks: { week: string; leads: number; deals: number }[] = [];
    const startMon = getMonday(weekStart);
    const endDate = end.getTime();
    let current = startMon.getTime();
    while (current <= endDate) {
      const mon = new Date(current);
      const sun = getSunday(mon);
      const bucketEnd = sun.getTime() > endDate ? end : sun;
      const label = `${mon.getDate()}/${mon.getMonth() + 1}`;
      weeks.push({
        week: label,
        leads: ENQUIRY_DATA.filter(e => isInRange(e.createdDate, mon, bucketEnd)).length,
        deals: DEAL_DATA.filter(d => isInRange(d.closeDate, mon, bucketEnd)).length,
      });
      current += 7 * 86400000;
    }
    return weeks;
  }, [weekStart, end]);

  return (
    <div className="space-y-6">
      {/* Snapshot card */}
      <div className="bg-accent border-l-4 border-primary rounded-lg p-5">
        <h3 className="text-sm font-semibold text-accent-foreground mb-3">
          Week of {weekStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – {end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </h3>
        <div className="grid grid-cols-8 gap-4">
          {snapshotItems.map(item => (
            <div key={item.label} className="text-center">
              <p className="text-2xl font-bold text-foreground">{item.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <KPICard title="Pipeline Value" value={formatCurrencyShort(pipelineValue)} previousValue={formatCurrencyShort(prevPipelineValue)} change={percentChange(pipelineValue, prevPipelineValue)} icon={<TrendingUp className="h-5 w-5 text-primary" />} />
        <KPICard title="Win Rate" value={`${winRate.toFixed(0)}%`} previousValue={`${prevWinRate.toFixed(0)}%`} change={percentChange(winRate, prevWinRate)} icon={<CheckCircle className="h-5 w-5 text-primary" />} />
        <KPICard title="WoW Change Rate" value={`${wowChange.value.toFixed(1)}%`} previousValue={`${prevDeals.length} deals`} change={wowChange} icon={<Activity className="h-5 w-5 text-primary" />} />
      </div>

      {/* Funnel chart with conversion rates */}
      <div className="bg-card rounded-lg border p-5">
        <h3 className="text-sm font-semibold mb-4">Revenue Funnel</h3>
        <ResponsiveContainer width="100%" height={220}>
          <FunnelChart>
            <Tooltip content={<CustomTooltip />} />
            <Funnel dataKey="value" data={funnelData} isAnimationActive>
              <LabelList position="right" fill="hsl(215,28%,17%)" fontSize={12} formatter={(v: number) => v} />
              <LabelList position="center" fill="#fff" fontSize={11} dataKey="name" />
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-8 mt-3 text-xs text-muted-foreground">
          <span>Lead → Converted: <strong className="text-foreground">{filteredLeads.length > 0 ? ((filteredConverted / filteredLeads.length) * 100).toFixed(1) : 0}%</strong></span>
          <span>Deals → Won: <strong className="text-foreground">{filteredDeals.length > 0 ? ((filteredWon / filteredDeals.length) * 100).toFixed(1) : 0}%</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Donut */}
        <div className="bg-card rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">Leads by Service Pillar</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pillarCounts} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pillarCounts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Trend over time */}
        <div className="bg-card rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">Trend over the Time</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={weeklyActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
              <XAxis dataKey="week" fontSize={11} label={{ value: 'Week', position: 'insideBottom', offset: -2, fontSize: 11 }} />
              <YAxis fontSize={11} label={{ value: 'Count', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="leads" name="Leads" stroke="#0D9488" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="deals" name="Deals" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
