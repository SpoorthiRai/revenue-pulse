import { useMemo, useState, useCallback } from 'react';
import { useData } from '@/context/DataContext';
import { useWeek } from '@/context/WeekContext';
import { usePillarFilter, getPillarColor, PILLAR_COLORS } from '@/context/PillarFilterContext';
import { formatCurrencyShort, formatCurrency, isInRange, percentChange, getMonday, getSunday } from '@/lib/formatters';
import { TrendingUp, TrendingDown, CheckCircle, Activity, Target, Clock, AlertTriangle, Lightbulb, BarChart3, Minus } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, Cell, Area, ComposedChart,
  PieChart, Pie, Sector
} from 'recharts';

const COLORS = ['hsl(174,83%,32%)', 'hsl(160,84%,39%)', 'hsl(38,92%,50%)', 'hsl(0,84%,60%)', 'hsl(217,91%,60%)', 'hsl(262,83%,58%)'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: '10px 14px' }}>
      <p style={{ fontSize: '12px', fontWeight: 500, color: '#0F172A', marginBottom: '4px' }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color, fontSize: '12px', display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
          <span style={{ color: '#6B7280' }}>{p.name}:</span>
          <span style={{ fontWeight: 500 }}>{typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

function TrendBadge({ change, suffix = 'vs prev period' }: { change: { value: number; direction: string }; suffix?: string }) {
  if (change.direction === 'no_prior') {
    return <span style={{ fontSize: '11px', color: '#6B7280' }}>No prior data</span>;
  }
  const isUp = change.direction === 'up';
  const isFlat = change.direction === 'flat';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${isFlat ? 'text-muted-foreground' : isUp ? 'text-success' : 'text-destructive'}`}>
      {isUp && <TrendingUp className="h-3 w-3" />}
      {!isUp && !isFlat && <TrendingDown className="h-3 w-3" />}
      {isFlat && <Minus className="h-3 w-3" />}
      {change.value.toFixed(1)}% {suffix}
    </span>
  );
}

const TOTAL_DEALS_STAGES = new Set([
  'Converted', 'Commercial Proposal', 'Negotiation', 'Win', 'Lost', 'Cancel', 'Closed'
]);

// Shared card style
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

export function ExecutiveSummaryView() {
  const { enquiryData: ENQUIRY_DATA, dealData: DEAL_DATA } = useData();
  const { weekStart, weekEnd } = useWeek();
  const { selectedPillar, togglePillar } = usePillarFilter();
  const end = weekEnd;

  const diff = end.getTime() - weekStart.getTime();
  const prevStart = new Date(weekStart.getTime() - diff);
  const prevEnd = new Date(weekStart.getTime() - 1);

  const filteredEnquiry = selectedPillar ? ENQUIRY_DATA.filter(e => e.pillar === selectedPillar) : ENQUIRY_DATA;
  const filteredDeals = selectedPillar ? DEAL_DATA.filter(d => d.pillar === selectedPillar) : DEAL_DATA;

  const weekLeads = filteredEnquiry.filter(e => isInRange(e.createdDate, weekStart, end));
  const prevLeads = filteredEnquiry.filter(e => isInRange(e.createdDate, prevStart, prevEnd));
  const weekDeals = filteredDeals.filter(d => isInRange(d.createdDealDate, weekStart, end) || isInRange(d.updatedAt, weekStart, end));
  const prevDeals = filteredDeals.filter(d => isInRange(d.createdDealDate, prevStart, prevEnd) || isInRange(d.updatedAt, prevStart, prevEnd));

  const wonDeals = weekDeals.filter(d => d.stage === 'Win');
  const prevWonDeals = prevDeals.filter(d => d.stage === 'Win');

  const revenueWon = wonDeals.reduce((s, d) => s + d.expectedAmount, 0);
  const prevRevenueWon = prevWonDeals.reduce((s, d) => s + d.expectedAmount, 0);

  const openStages = ['Commercial Proposal', 'Negotiation', 'Assign', 'First Contact', 'Discovery Meeting'];
  const pipelineValue = weekDeals.filter(d => openStages.includes(d.stage)).reduce((s, d) => s + d.expectedAmount, 0);
  const prevPipelineValue = prevDeals.filter(d => openStages.includes(d.stage)).reduce((s, d) => s + d.expectedAmount, 0);
  const hasActivePipeline = weekDeals.some(d => openStages.includes(d.stage));

  const decided = weekDeals.filter(d => ['Win', 'Lost', 'Cancel', 'Closed'].includes(d.stage));
  const winRate = decided.length > 0 ? (wonDeals.length / decided.length) * 100 : 0;
  const prevDecided = prevDeals.filter(d => ['Win', 'Lost', 'Cancel', 'Closed'].includes(d.stage));
  const prevWinRate = prevDecided.length > 0 ? (prevWonDeals.length / prevDecided.length) * 100 : 0;

  const salesCycleDays = useMemo(() => {
    const days = wonDeals.map(d => {
      if (!d.closeDate || !d.createdDealDate) return null;
      const diff = (new Date(d.closeDate).getTime() - new Date(d.createdDealDate).getTime()) / 86400000;
      return diff > 0 ? diff : null;
    }).filter(Boolean) as number[];
    return days.length > 0 ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : 0;
  }, [wonDeals]);

  const prevSalesCycleDays = useMemo(() => {
    const days = prevWonDeals.map(d => {
      if (!d.closeDate || !d.createdDealDate) return null;
      const diff = (new Date(d.closeDate).getTime() - new Date(d.createdDealDate).getTime()) / 86400000;
      return diff > 0 ? diff : null;
    }).filter(Boolean) as number[];
    return days.length > 0 ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : 0;
  }, [prevWonDeals]);

  const weekAllRecords = filteredEnquiry.filter(e => isInRange(e.createdDate, weekStart, end));
  const weekDealRecords = weekAllRecords.filter(e => e.recordType === 'Deal').length;
  const weekTotalRecords = weekAllRecords.filter(e => e.recordType === 'Lead' || e.recordType === 'Deal').length;
  const leadConversionRate = weekTotalRecords > 0 ? (weekDealRecords / weekTotalRecords) * 100 : 0;
  const prevAllRecords = filteredEnquiry.filter(e => isInRange(e.createdDate, prevStart, prevEnd));
  const prevDealRecords = prevAllRecords.filter(e => e.recordType === 'Deal').length;
  const prevTotalRecords = prevAllRecords.filter(e => e.recordType === 'Lead' || e.recordType === 'Deal').length;
  const prevLeadConversionRate = prevTotalRecords > 0 ? (prevDealRecords / prevTotalRecords) * 100 : 0;

  const dealsClosed = weekDeals.filter(d => d.stage === 'Closed').length;
  const prevDealsClosed = prevDeals.filter(d => d.stage === 'Closed').length;

  const filteredKpis = [
    { title: 'Revenue Won', value: formatCurrencyShort(revenueWon), prevValue: formatCurrencyShort(prevRevenueWon), change: percentChange(revenueWon, prevRevenueWon), icon: <TrendingUp className="h-4 w-4" /> },
    { title: 'Pipeline Value', value: formatCurrencyShort(pipelineValue), prevValue: hasActivePipeline ? formatCurrencyShort(prevPipelineValue) : 'No active pipeline', change: hasActivePipeline ? percentChange(pipelineValue, prevPipelineValue) : undefined, icon: <BarChart3 className="h-4 w-4" /> },
    { title: 'Win Rate', value: `${winRate.toFixed(0)}%`, prevValue: `${prevWinRate.toFixed(0)}%`, change: percentChange(winRate, prevWinRate), icon: <CheckCircle className="h-4 w-4" /> },
    { title: 'Deals Closed', value: String(dealsClosed), prevValue: `was ${prevDealsClosed}`, change: percentChange(dealsClosed, prevDealsClosed), icon: <Target className="h-4 w-4" /> },
  ];

  const allTimeWonDeals = DEAL_DATA.filter(d => d.stage === 'Win');
  const allTimeRevenue = allTimeWonDeals.reduce((s, d) => s + d.expectedAmount, 0);
  const allTimeAvgDealSize = allTimeWonDeals.length > 0 ? allTimeRevenue / allTimeWonDeals.length : 0;

  const allTimeSalesCycle = useMemo(() => {
    const days = allTimeWonDeals.map(d => {
      if (!d.closeDate || !d.createdDealDate) return null;
      const diff = (new Date(d.closeDate).getTime() - new Date(d.createdDealDate).getTime()) / 86400000;
      return diff > 0 ? diff : null;
    }).filter(Boolean) as number[];
    return days.length > 0 ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : 0;
  }, [allTimeWonDeals]);

  const allTimeDealRecords = ENQUIRY_DATA.filter(e => e.recordType === 'Deal').length;
  const allTimeTotalRecords = ENQUIRY_DATA.filter(e => e.recordType === 'Lead' || e.recordType === 'Deal').length;
  const allTimeLeadConversion = allTimeTotalRecords > 0 ? (allTimeDealRecords / allTimeTotalRecords) * 100 : 0;

  const benchmarkKpis = [
    { title: 'Avg Deal Size', value: formatCurrencyShort(allTimeAvgDealSize), icon: <Target className="h-4 w-4" /> },
    { title: 'Sales Cycle', value: `${allTimeSalesCycle} days`, icon: <Clock className="h-4 w-4" /> },
    { title: 'Lead Conversion', value: `${allTimeLeadConversion.toFixed(0)}%`, icon: <Activity className="h-4 w-4" /> },
  ];

  const ANNUAL_TARGET = 50000000;
  const revenueClosed = filteredDeals.filter(d => d.stage === 'Win').reduce((s, d) => s + d.expectedAmount, 0);
  const weightedPipeline = filteredDeals.filter(d => d.stage === 'Negotiation').reduce((s, d) => s + d.expectedAmount * 0.6, 0);
  const forecastedRevenue = revenueClosed + weightedPipeline;
  const targetAchievement = (forecastedRevenue / ANNUAL_TARGET) * 100;

  const funnelLeadsCount = weekAllRecords.length;
  const funnelDealsCount = weekAllRecords.filter(e => e.recordType === 'Deal').length;
  const funnelWinCount = weekDeals.filter(d => d.stage === 'Win').length;
  const funnelClosedCount = weekDeals.filter(d => d.stage === 'Closed').length;

  const simpleFunnel = [
    { name: 'Leads', count: funnelLeadsCount, color: 'hsl(174,83%,32%)' },
    { name: 'Deals', count: funnelDealsCount, color: 'hsl(38,92%,50%)' },
    { name: 'Win', count: funnelWinCount, color: 'hsl(217,91%,60%)' },
    { name: 'Closed', count: funnelClosedCount, color: 'hsl(200,70%,50%)' },
  ];

  const funnelConversions = simpleFunnel.slice(0, -1).map((stage, i) => {
    const next = simpleFunnel[i + 1];
    const rate = stage.count > 0 ? (next.count / stage.count) * 100 : 0;
    return { from: stage.name, to: next.name, rate, drop: 100 - rate };
  });
  const biggestLeakage = funnelConversions.length > 0 ? funnelConversions.reduce((worst, c) => c.drop > worst.drop ? c : worst, funnelConversions[0]) : null;
  const maxFunnelCount = Math.max(...simpleFunnel.map(s => s.count), 1);

  const pipelineByStage = useMemo(() => {
    const stages = ['Negotiation', 'Commercial Proposal', 'Closed'];
    return stages.map(stage => {
      const deals = weekDeals.filter(d => d.stage === stage);
      return { stage, deals: deals.length, value: deals.reduce((s, d) => s + d.expectedAmount, 0) };
    }).filter(s => s.deals > 0);
  }, [weekDeals]);

  const totalPipelineActive = filteredDeals.filter(d => !['Win', 'Lost', 'Cancel'].includes(d.stage))
    .reduce((s, d) => s + d.expectedAmount, 0);
  const pipelineCoverage = ANNUAL_TARGET > 0 ? ((totalPipelineActive + revenueClosed) / ANNUAL_TARGET) : 0;

  const allWeekDeals = DEAL_DATA.filter(d => isInRange(d.createdDealDate, weekStart, end) || isInRange(d.updatedAt, weekStart, end));
  const allWonDeals = allWeekDeals.filter(d => d.stage === 'Win');

  const donutDealData = useMemo(() => {
    const pillars = [...new Set(ENQUIRY_DATA.map(e => e.pillar).concat(DEAL_DATA.map(d => d.pillar)))].filter(Boolean);
    return pillars.map(pillar => {
      const deals = allWonDeals.filter(d => d.pillar === pillar);
      return { name: pillar, value: deals.length, color: getPillarColor(pillar) };
    }).filter(s => s.value > 0).sort((a, b) => b.value - a.value);
  }, [allWonDeals, ENQUIRY_DATA, DEAL_DATA]);

  const [revenueDonutFilter, setRevenueDonutFilter] = useState<'Win' | 'Closed' | 'Both'>('Both');

  const donutRevenueData = useMemo(() => {
    const pillars = [...new Set(ENQUIRY_DATA.map(e => e.pillar).concat(DEAL_DATA.map(d => d.pillar)))].filter(Boolean);
    const filteredDonutDeals = allWeekDeals.filter(d => {
      if (revenueDonutFilter === 'Win') return d.stage === 'Win';
      if (revenueDonutFilter === 'Closed') return d.stage === 'Closed';
      return d.stage === 'Win' || d.stage === 'Closed';
    });
    return pillars.map(pillar => {
      const deals = filteredDonutDeals.filter(d => d.pillar === pillar);
      const revenue = deals.reduce((s, d) => s + d.expectedAmount, 0);
      return { name: pillar, value: revenue, color: getPillarColor(pillar) };
    }).filter(s => s.value > 0).sort((a, b) => b.value - a.value);
  }, [allWeekDeals, ENQUIRY_DATA, DEAL_DATA, revenueDonutFilter]);

  const totalDealsWon = allWonDeals.length;
  const totalRevenueFiltered = donutRevenueData.reduce((s, d) => s + d.value, 0);

  const servicePillarData = useMemo(() => {
    const pillars = [...new Set(ENQUIRY_DATA.map(e => e.pillar))];
    return pillars.map(pillar => {
      const leads = weekLeads.filter(e => e.pillar === pillar).length;
      const deals = wonDeals.filter(d => d.pillar === pillar);
      const revenue = deals.reduce((s, d) => s + d.expectedAmount, 0);
      const allPillarDeals = weekDeals.filter(d => d.pillar === pillar);
      const pillarDecided = allPillarDeals.filter(d => ['Win', 'Lost', 'Cancel'].includes(d.stage));
      const wr = pillarDecided.length > 0 ? (deals.length / pillarDecided.length) * 100 : 0;
      return { pillar, leads, dealsWon: deals.length, revenue, winRate: wr };
    }).filter(s => s.leads > 0 || s.dealsWon > 0).sort((a, b) => b.revenue - a.revenue);
  }, [weekLeads, wonDeals, weekDeals, ENQUIRY_DATA]);

  const weeklyActivity = useMemo(() => {
    const weeks: { week: string; leads: number; converted: number; deals: number; won: number; revenue: number }[] = [];
    const startMon = getMonday(weekStart);
    const endDate = end.getTime();
    let current = startMon.getTime();
    while (current <= endDate) {
      const mon = new Date(current);
      const sun = getSunday(mon);
      const bucketEnd = sun.getTime() > endDate ? end : sun;
      const label = `${mon.getDate()}/${mon.getMonth() + 1}`;
      const bucketLeads = filteredEnquiry.filter(e => isInRange(e.createdDate, mon, bucketEnd));
      const bucketConverted = bucketLeads.filter(e => e.status === 'Converted');
      const bucketDeals = filteredDeals.filter(d => isInRange(d.createdDealDate, mon, bucketEnd) || isInRange(d.updatedAt, mon, bucketEnd));
      const bucketWon = bucketDeals.filter(d => d.stage === 'Win');
      weeks.push({
        week: label,
        leads: bucketLeads.length,
        converted: bucketConverted.length,
        deals: bucketDeals.length,
        won: bucketWon.length,
        revenue: bucketWon.reduce((s, d) => s + d.expectedAmount, 0),
      });
      current += 7 * 86400000;
    }
    return weeks;
  }, [weekStart, end, filteredEnquiry, filteredDeals]);

  const stuckDeals = useMemo(() => {
    const today = new Date('2025-10-07');
    return filteredDeals.filter(d => !['Win', 'Lost', 'Cancel'].includes(d.stage)).map(d => {
      const daysInStage = Math.abs(Math.round((today.getTime() - new Date(d.createdDealDate || d.closeDate).getTime()) / 86400000));
      return { ...d, daysInStage };
    });
  }, [filteredDeals]);

  const stuckByStage = useMemo(() => {
    const map: Record<string, number> = {};
    stuckDeals.forEach(d => { map[d.stage] = (map[d.stage] || 0) + 1; });
    return Object.entries(map).map(([stage, count]) => ({ stage, count }));
  }, [stuckDeals]);

  const { positiveInsights, attentionInsights } = useMemo(() => {
    const positive: string[] = [];
    const attention: string[] = [];

    const revChange = percentChange(revenueWon, prevRevenueWon);
    if (revChange.direction === 'up') positive.push(`Revenue won increased by ${revChange.value.toFixed(0)}% compared to previous period.`);
    else if (revChange.direction === 'down') attention.push(`Revenue won decreased by ${revChange.value.toFixed(0)}% → Review deal pipeline and accelerate closures.`);

    const lcChange = percentChange(leadConversionRate, prevLeadConversionRate);
    if (lcChange.direction === 'up') positive.push(`Lead conversion rate improved by ${lcChange.value.toFixed(0)}% this period.`);
    else if (lcChange.direction === 'down') attention.push(`Lead conversion rate dropped by ${lcChange.value.toFixed(0)}% → Improve lead qualification process.`);

    const leadChange = percentChange(weekLeads.length, prevLeads.length);
    if (leadChange.direction === 'up') positive.push(`Lead volume grew by ${leadChange.value.toFixed(0)}% vs prior period.`);
    else if (leadChange.direction === 'down') attention.push(`Lead volume dropped ${leadChange.value.toFixed(0)}% → Increase marketing and outreach efforts.`);

    const winRateChange = percentChange(winRate, prevWinRate);
    if (winRateChange.direction === 'up') positive.push(`Win rate improved to ${winRate.toFixed(0)}% (up ${winRateChange.value.toFixed(0)}%).`);
    else if (winRateChange.direction === 'down') attention.push(`Win rate declined to ${winRate.toFixed(0)}% → Analyse lost deals for patterns.`);

    const lostChange = percentChange(weekDeals.filter(d => d.stage === 'Lost').length, prevDeals.filter(d => d.stage === 'Lost').length);
    if (lostChange.direction === 'down') positive.push(`Deals lost decreased by ${lostChange.value.toFixed(0)}% — fewer losses this period.`);
    else if (lostChange.direction === 'up') attention.push(`Deals lost increased by ${lostChange.value.toFixed(0)}% → Investigate loss reasons and improve proposals.`);

    if (servicePillarData.length > 0) {
      const topByRev = servicePillarData[0];
      if (topByRev.revenue > 0) positive.push(`${topByRev.pillar} is the top revenue contributor this period.`);
    }

    if (pipelineCoverage >= 1.5) positive.push(`Pipeline coverage is ${pipelineCoverage.toFixed(1)}x — healthy.`);
    else if (pipelineCoverage < 1.0) attention.push(`Pipeline coverage at ${pipelineCoverage.toFixed(1)}x — at risk → Accelerate prospecting to build pipeline.`);
    else attention.push(`Pipeline coverage at ${pipelineCoverage.toFixed(1)}x — adequate but thin → Add more qualified opportunities.`);

    if (biggestLeakage && biggestLeakage.drop > 20) {
      attention.push(`Biggest funnel drop-off at ${biggestLeakage.from} → ${biggestLeakage.to} (${biggestLeakage.drop.toFixed(0)}%) → Focus on stage conversion improvement.`);
    }

    if (targetAchievement >= 100) positive.push(`Forecasted revenue exceeds annual target at ${targetAchievement.toFixed(0)}%.`);
    else if (targetAchievement < 90) attention.push(`Forecast at ${targetAchievement.toFixed(0)}% of annual target → Action needed to close gap.`);

    const scChange = percentChange(salesCycleDays, prevSalesCycleDays);
    if (scChange.direction === 'down' && salesCycleDays > 0) positive.push(`Sales cycle shortened to ${salesCycleDays} days (improved ${scChange.value.toFixed(0)}%).`);
    else if (scChange.direction === 'up' && salesCycleDays > 0) attention.push(`Sales cycle lengthened to ${salesCycleDays} days → Streamline approval workflows.`);

    return { positiveInsights: positive.slice(0, 4), attentionInsights: attention.slice(0, 4) };
  }, [revenueWon, prevRevenueWon, leadConversionRate, prevLeadConversionRate, weekLeads, prevLeads, winRate, prevWinRate, weekDeals, prevDeals, servicePillarData, pipelineCoverage, biggestLeakage, targetAchievement, salesCycleDays, prevSalesCycleDays]);

  const [trendMode, setTrendMode] = useState<'leads-deals' | 'deals-revenue' | 'win-loss'>('leads-deals');
  const trendTitle = trendMode === 'leads-deals' ? 'Lead & Deal Volume Over Time' : trendMode === 'deals-revenue' ? 'Deal Count vs Revenue Over Time' : 'Wins vs Losses Over Time';

  const trendData = useMemo(() => {
    return weeklyActivity.map(w => {
      const lost = filteredDeals.filter(d => {
        const mon = new Date(weekStart);
        const parts = w.week.split('/');
        const wkMon = new Date(mon.getFullYear(), parseInt(parts[1]) - 1, parseInt(parts[0]));
        const wkSun = new Date(wkMon.getTime() + 6 * 86400000);
        wkSun.setHours(23, 59, 59, 999);
        return d.stage === 'Lost' && (isInRange(d.createdDealDate, wkMon, wkSun) || isInRange(d.updatedAt, wkMon, wkSun));
      }).length;
      const decided = w.won + lost;
      const winRate = decided > 0 ? Math.round((w.won / decided) * 100) : 0;
      return { ...w, lost, winRate };
    });
  }, [weeklyActivity, filteredDeals, weekStart]);

  const chartGridColor = '#F3F4F6';

  return (
    <div className="space-y-6">
      {/* Period comparison label */}
      <div className="flex items-center gap-2 text-xs" style={{ color: '#6B7280' }}>
        <span style={{ backgroundColor: '#F1F5F9', padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }}>
          {weekStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – {end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
        <span>compared to previous equal period</span>
      </div>

      {/* KEY INSIGHTS */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div className="grid grid-cols-2 divide-x">
          <div style={{ padding: '16px 20px', backgroundColor: '#F0FDF4', borderLeft: '3px solid #22C55E', borderRadius: '12px 0 0 12px' }}>
            <div className="flex items-center gap-2 mb-3">
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22C55E', display: 'inline-block' }} />
              <h3 style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A' }}>Effective Areas</h3>
            </div>
            {positiveInsights.length > 0 ? (
              <ul className="space-y-2">
                {positiveInsights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2" style={{ fontSize: '13px', lineHeight: 1.6, color: '#374151' }}>
                    <span style={{ color: '#22C55E', marginTop: '2px', flexShrink: 0 }}>●</span>
                    {insight}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: '13px', color: '#6B7280', fontStyle: 'italic' }}>No highlights this period</p>
            )}
          </div>
          <div style={{ padding: '16px 20px', backgroundColor: '#FFF7F7', borderLeft: '3px solid #EF4444' }}>
            <div className="flex items-center gap-2 mb-3">
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#EF4444', display: 'inline-block' }} />
              <h3 style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A' }}>Needs Attention</h3>
            </div>
            {attentionInsights.length > 0 ? (
              <ul className="space-y-2">
                {attentionInsights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2" style={{ fontSize: '13px', lineHeight: 1.6, color: '#374151' }}>
                    <span style={{ color: '#EF4444', marginTop: '2px', flexShrink: 0 }}>●</span>
                    {insight}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-success" style={{ fontSize: '13px', fontStyle: 'italic' }}>All clear this period</p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 1: Executive KPI Cards */}
      <div className="flex gap-4">
        <div className="grid grid-cols-4 gap-4 flex-1">
          {filteredKpis.map(kpi => (
            <div key={kpi.title} className="kpi-card">
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: '11px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280' }}>{kpi.title}</span>
                <span style={{ color: '#D1D5DB' }}>{kpi.icon}</span>
              </div>
              <p style={{ fontSize: '28px', fontWeight: 600, color: '#0F172A' }}>{kpi.value}</p>
              <div className="mt-2 space-y-0.5">
                {kpi.change && <TrendBadge change={kpi.change} />}
                <p style={{ fontSize: '11px', color: '#9CA3AF' }}>{kpi.prevValue}</p>
              </div>
            </div>
          ))}
        </div>

        {/* All Time Benchmark KPIs */}
        <div style={{ borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', padding: '12px', flex: 1 }}>
          <p style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>All Time Benchmarks · not affected by filters</p>
          <div className="grid grid-cols-3 gap-3">
            {benchmarkKpis.map(kpi => (
              <div key={kpi.title} className="kpi-card">
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontSize: '11px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280' }}>{kpi.title}</span>
                  <span style={{ color: '#D1D5DB' }}>{kpi.icon}</span>
                </div>
                <p style={{ fontSize: '28px', fontWeight: 600, color: '#0F172A' }}>{kpi.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* SECTION 3: Sales Funnel */}
        <div style={cardStyle}>
          <h3 style={sectionHeadingStyle}>Sales Funnel Conversion</h3>
          <div className="space-y-4">
            {simpleFunnel.map((stage, i) => {
              const widthPct = maxFunnelCount > 0 ? (stage.count / maxFunnelCount) * 100 : 0;
              const conversion = i > 0 ? funnelConversions[i - 1] : null;
              return (
                <div key={stage.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>{stage.name}</span>
                      {conversion && (
                        <span style={{ fontSize: '11px', color: '#9CA3AF', fontStyle: 'italic' }}>
                          {conversion.rate.toFixed(0)}% from {conversion.from}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{stage.count}</span>
                  </div>
                  <div className="w-full rounded overflow-hidden" style={{ backgroundColor: '#F3F4F6', height: '24px', borderRadius: '4px' }}>
                    <div
                      className="h-full flex items-center justify-end pr-3 transition-all"
                      style={{
                        width: `${Math.max(widthPct, 8)}%`,
                        backgroundColor: stage.color,
                        borderRadius: '4px',
                      }}
                    >
                      {widthPct > 15 && (
                        <span style={{ fontSize: '12px', fontWeight: 500, color: 'white' }}>{stage.count}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {biggestLeakage && biggestLeakage.drop > 10 && (
            <div className="mt-4 flex items-center gap-1.5" style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', color: '#92400E' }}>
              <AlertTriangle className="h-3.5 w-3.5" style={{ color: '#F97316' }} />
              Biggest drop occurs between {biggestLeakage.from} → {biggestLeakage.to} stage ({biggestLeakage.drop.toFixed(0)}% drop)
            </div>
          )}
        </div>

        {/* SECTION 4: Pipeline Health */}
        <div style={cardStyle}>
          <h3 style={sectionHeadingStyle}>Pipeline Health</h3>
          {pipelineByStage.length > 0 ? (
            <table className="w-full text-sm mb-4">
              <thead>
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280', paddingBottom: '8px' }}>Stage</th>
                  <th style={{ textAlign: 'center', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280', paddingBottom: '8px' }}>Deals</th>
                  <th style={{ textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280', paddingBottom: '8px' }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {pipelineByStage.map(s => (
                  <tr key={s.stage} className="border-b last:border-0">
                    <td className="py-2 font-medium" style={{ fontSize: '13px', color: '#374151' }}>{s.stage}</td>
                    <td className="py-2 text-center" style={{ fontSize: '13px', color: '#374151' }}>{s.deals}</td>
                    <td className="py-2 text-right font-mono" style={{ fontSize: '13px', color: '#374151' }}>{formatCurrencyShort(s.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ fontSize: '13px', color: '#6B7280' }} className="mb-4">No active pipeline deals in selected period.</p>
          )}

          {stuckDeals.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-1.5 mb-2" style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A' }}>
                <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                Deals Requiring Attention
              </div>
              <div className="space-y-1.5">
                {stuckByStage.map(s => (
                  <div key={s.stage} className="flex items-center justify-between bg-warning/10 rounded px-3 py-1.5" style={{ fontSize: '12px' }}>
                    <span className="font-medium">{s.stage}</span>
                    <span className="font-bold text-warning">{s.count} deal{s.count > 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 5: Service Pillar — Donut Charts */}
      <div className="grid grid-cols-2 gap-4">
        <div style={cardStyle}>
          <h3 style={sectionHeadingStyle}>Deals by Service Pillar</h3>
          {donutDealData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={donutDealData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={88}
                    dataKey="value"
                    stroke="none"
                    strokeWidth={2}
                    onClick={(_, idx) => togglePillar(donutDealData[idx].name)}
                    className="cursor-pointer outline-none"
                  >
                    {donutDealData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.color}
                        opacity={selectedPillar && selectedPillar !== entry.name ? 0.3 : 1}
                        stroke={selectedPillar === entry.name ? 'white' : 'none'}
                        strokeWidth={selectedPillar === entry.name ? 3 : 0}
                      />
                    ))}
                  </Pie>
                  <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '24px', fontWeight: 600, fill: '#0F172A' }}>{totalDealsWon}</text>
                  <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '11px', fill: '#6B7280' }}>Deals Won</text>
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1.5">
                {donutDealData.map(d => {
                  const pct = totalDealsWon > 0 ? ((d.value / totalDealsWon) * 100).toFixed(0) : '0';
                  return (
                    <div
                      key={d.name}
                      className={`flex items-center justify-between cursor-pointer rounded px-2 py-1 transition-opacity ${selectedPillar && selectedPillar !== d.name ? 'opacity-30' : ''}`}
                      onClick={() => togglePillar(d.name)}
                      style={{ fontSize: '13px' }}
                    >
                      <div className="flex items-center gap-2">
                        <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: d.color, flexShrink: 0 }} />
                        <span style={{ fontWeight: 500, color: '#374151' }}>{d.name}</span>
                      </div>
                      <span style={{ color: '#6B7280' }}>{d.value} deals · {pct}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p style={{ fontSize: '13px', color: '#6B7280' }}>No deal data for selected period.</p>
          )}
        </div>

        <div style={cardStyle}>
          <div className="flex items-center justify-between mb-2">
            <h3 style={{ ...sectionHeadingStyle, marginBottom: 0 }}>Revenue by Service Pillar</h3>
          </div>
          <div className="flex overflow-hidden mb-3" style={{ borderRadius: '6px', border: '0.5px solid #D1D5DB' }}>
            {(['Win', 'Closed', 'Both'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => setRevenueDonutFilter(opt)}
                className="flex-1 text-xs font-medium transition-colors"
                style={{
                  padding: '6px 14px',
                  backgroundColor: revenueDonutFilter === opt ? '#0F172A' : 'transparent',
                  color: revenueDonutFilter === opt ? '#FFFFFF' : '#6B7280',
                }}
              >
                {opt}
              </button>
            ))}
          </div>
          {donutRevenueData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={donutRevenueData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={88}
                    dataKey="value"
                    stroke="none"
                    strokeWidth={2}
                    onClick={(_, idx) => togglePillar(donutRevenueData[idx].name)}
                    className="cursor-pointer outline-none"
                  >
                    {donutRevenueData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.color}
                        opacity={selectedPillar && selectedPillar !== entry.name ? 0.3 : 1}
                        stroke={selectedPillar === entry.name ? 'white' : 'none'}
                        strokeWidth={selectedPillar === entry.name ? 3 : 0}
                      />
                    ))}
                  </Pie>
                  <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '18px', fontWeight: 600, fill: '#0F172A' }}>{formatCurrencyShort(totalRevenueFiltered)}</text>
                  <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '11px', fill: '#6B7280' }}>Total Revenue</text>
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1.5">
                {donutRevenueData.map(d => {
                  const pct = totalRevenueFiltered > 0 ? ((d.value / totalRevenueFiltered) * 100).toFixed(0) : '0';
                  return (
                    <div
                      key={d.name}
                      className={`flex items-center justify-between cursor-pointer rounded px-2 py-1 transition-opacity ${selectedPillar && selectedPillar !== d.name ? 'opacity-30' : ''}`}
                      onClick={() => togglePillar(d.name)}
                      style={{ fontSize: '13px' }}
                    >
                      <div className="flex items-center gap-2">
                        <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: d.color, flexShrink: 0 }} />
                        <span style={{ fontWeight: 500, color: '#374151' }}>{d.name}</span>
                      </div>
                      <span style={{ color: '#6B7280' }}>{formatCurrencyShort(d.value)} · {pct}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p style={{ fontSize: '13px', color: '#6B7280' }}>No revenue data for selected period.</p>
          )}
        </div>
      </div>

      {/* SECTION 6: Trend Over Time with Toggle */}
      <div style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ ...sectionHeadingStyle, marginBottom: 0 }}>{trendTitle}</h3>
          <div className="flex overflow-hidden" style={{ borderRadius: '6px', border: '0.5px solid #D1D5DB' }}>
            {([
              { key: 'leads-deals', label: 'Leads & Deals' },
              { key: 'deals-revenue', label: 'Deals & Revenue' },
              { key: 'win-loss', label: 'Win vs Loss' },
            ] as const).map(opt => (
              <button
                key={opt.key}
                onClick={() => setTrendMode(opt.key)}
                className="text-xs font-medium transition-colors"
                style={{
                  padding: '6px 14px',
                  backgroundColor: trendMode === opt.key ? '#0F172A' : 'transparent',
                  color: trendMode === opt.key ? '#FFFFFF' : '#6B7280',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          {trendMode === 'win-loss' ? (
            <ComposedChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
              <XAxis dataKey="week" fontSize={11} tick={{ fill: '#9CA3AF' }} />
              <YAxis fontSize={11} tick={{ fill: '#9CA3AF' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="won" name="Won" fill="hsl(160,84%,39%)" fillOpacity={0.15} stroke="none" />
              <Area type="monotone" dataKey="lost" name="Lost (area)" fill="hsl(0,84%,60%)" fillOpacity={0.1} stroke="none" />
              <Line type="monotone" dataKey="won" name="Won" stroke="hsl(160,84%,39%)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="lost" name="Lost" stroke="hsl(0,84%,60%)" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          ) : (
            <LineChart data={weeklyActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
              <XAxis dataKey="week" fontSize={11} tick={{ fill: '#9CA3AF' }} />
              <YAxis yAxisId="left" fontSize={11} tick={{ fill: '#9CA3AF' }} />
              {trendMode === 'deals-revenue' && <YAxis yAxisId="right" orientation="right" fontSize={11} tick={{ fill: '#9CA3AF' }} tickFormatter={v => formatCurrencyShort(v)} />}
              <Tooltip content={<CustomTooltip />} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              {trendMode === 'leads-deals' && (
                <>
                  <Line yAxisId="left" type="monotone" dataKey="leads" name="Leads" stroke="hsl(174,83%,32%)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="left" type="monotone" dataKey="deals" name="Total Deals" stroke="hsl(217,91%,60%)" strokeWidth={2} dot={{ r: 3 }} />
                </>
              )}
              {trendMode === 'deals-revenue' && (
                <>
                  <Line yAxisId="left" type="monotone" dataKey="deals" name="Total Deals" stroke="hsl(217,91%,60%)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(38,92%,50%)" strokeWidth={2} dot={{ r: 3 }} />
                </>
              )}
            </LineChart>
          )}
        </ResponsiveContainer>

        <div style={{ borderTop: '1px solid #F3F4F6', margin: '16px 0' }} />

        <h4 style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9CA3AF', marginBottom: '12px' }}>
          {trendMode === 'leads-deals' ? 'Lead & Deal Volume — Bar View' : trendMode === 'deals-revenue' ? 'Deal Count vs Revenue — Bar View' : 'Wins vs Losses — Bar View'}
        </h4>
        <ResponsiveContainer width="100%" height={260}>
          {trendMode === 'win-loss' ? (
            <ComposedChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
              <XAxis dataKey="week" fontSize={11} tick={{ fill: '#9CA3AF' }} />
              <YAxis yAxisId="left" fontSize={11} tick={{ fill: '#9CA3AF' }} />
              <YAxis yAxisId="right" orientation="right" fontSize={11} tick={{ fill: '#9CA3AF' }} tickFormatter={v => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="won" name="Won" fill="hsl(160,84%,39%)" radius={[3, 3, 0, 0]} />
              <Bar yAxisId="left" dataKey="lost" name="Lost" fill="hsl(0,84%,60%)" radius={[3, 3, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="winRate" name="Win Rate %" stroke="hsl(38,92%,50%)" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          ) : trendMode === 'deals-revenue' ? (
            <BarChart data={weeklyActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
              <XAxis dataKey="week" fontSize={11} tick={{ fill: '#9CA3AF' }} />
              <YAxis yAxisId="left" fontSize={11} tick={{ fill: '#9CA3AF' }} />
              <YAxis yAxisId="right" orientation="right" fontSize={11} tick={{ fill: '#9CA3AF' }} tickFormatter={v => formatCurrencyShort(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="deals" name="Total Deals" fill="hsl(217,91%,60%)" radius={[3, 3, 0, 0]} />
              <Bar yAxisId="right" dataKey="revenue" name="Revenue" fill="hsl(38,92%,50%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          ) : (
            <BarChart data={weeklyActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
              <XAxis dataKey="week" fontSize={11} tick={{ fill: '#9CA3AF' }} />
              <YAxis fontSize={11} tick={{ fill: '#9CA3AF' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="leads" name="Leads" fill="hsl(174,83%,32%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="deals" name="Total Deals" fill="hsl(217,91%,60%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
