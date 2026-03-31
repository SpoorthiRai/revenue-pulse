import { useMemo, useState } from 'react';
import { useData } from '@/context/DataContext';
import { useWeek } from '@/context/WeekContext';
import { formatCurrencyShort, formatCurrency, isInRange, percentChange, getMonday, getSunday } from '@/lib/formatters';
import { TrendingUp, TrendingDown, CheckCircle, Activity, Target, Clock, AlertTriangle, Lightbulb, BarChart3, Minus } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, Cell
} from 'recharts';

const COLORS = ['hsl(174,83%,32%)', 'hsl(160,84%,39%)', 'hsl(38,92%,50%)', 'hsl(0,84%,60%)', 'hsl(217,91%,60%)', 'hsl(262,83%,58%)'];

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

function TrendBadge({ change, suffix = 'vs prev period' }: { change: { value: number; direction: string }; suffix?: string }) {
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

export function ExecutiveSummaryView() {
  const { enquiryData: ENQUIRY_DATA, dealData: DEAL_DATA } = useData();
  const { weekStart, weekEnd } = useWeek();
  const end = weekEnd;

  // Previous period
  const diff = end.getTime() - weekStart.getTime();
  const prevStart = new Date(weekStart.getTime() - diff);
  const prevEnd = new Date(weekStart.getTime() - 1);

  // Filtered data
  const weekLeads = ENQUIRY_DATA.filter(e => isInRange(e.createdDate, weekStart, end));
  const prevLeads = ENQUIRY_DATA.filter(e => isInRange(e.createdDate, prevStart, prevEnd));
  const weekDeals = DEAL_DATA.filter(d => isInRange(d.closeDate, weekStart, end));
  const prevDeals = DEAL_DATA.filter(d => isInRange(d.closeDate, prevStart, prevEnd));

  const wonDeals = weekDeals.filter(d => d.stage === 'Win');
  const prevWonDeals = prevDeals.filter(d => d.stage === 'Win');

  // ========== SECTION 1: KPIs ==========
  const revenueWon = wonDeals.reduce((s, d) => s + d.negotiatedAmount, 0);
  const prevRevenueWon = prevWonDeals.reduce((s, d) => s + d.negotiatedAmount, 0);

  const pipelineValue = weekDeals.filter(d => !['Win', 'Lost', 'Cancel'].includes(d.stage))
    .reduce((s, d) => s + d.expectedAmount, 0)
    + wonDeals.reduce((s, d) => s + d.negotiatedAmount, 0);
  const prevPipelineValue = prevDeals.filter(d => !['Win', 'Lost', 'Cancel'].includes(d.stage))
    .reduce((s, d) => s + d.expectedAmount, 0)
    + prevWonDeals.reduce((s, d) => s + d.negotiatedAmount, 0);

  const decided = weekDeals.filter(d => ['Win', 'Lost', 'Cancel'].includes(d.stage));
  const winRate = decided.length > 0 ? (wonDeals.length / decided.length) * 100 : 0;
  const prevDecided = prevDeals.filter(d => ['Win', 'Lost', 'Cancel'].includes(d.stage));
  const prevWinRate = prevDecided.length > 0 ? (prevWonDeals.length / prevDecided.length) * 100 : 0;

  const avgDealSize = wonDeals.length > 0 ? revenueWon / wonDeals.length : 0;
  const prevAvgDealSize = prevWonDeals.length > 0 ? prevRevenueWon / prevWonDeals.length : 0;

  const salesCycleDays = useMemo(() => {
    const days = wonDeals.map(d => {
      const lead = ENQUIRY_DATA.find(e => e.leadNumber === d.dealId);
      if (!lead) return null;
      return (new Date(d.closeDate).getTime() - new Date(lead.createdDate).getTime()) / 86400000;
    }).filter(Boolean) as number[];
    return days.length > 0 ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : 0;
  }, [wonDeals, ENQUIRY_DATA]);

  const prevSalesCycleDays = useMemo(() => {
    const days = prevWonDeals.map(d => {
      const lead = ENQUIRY_DATA.find(e => e.leadNumber === d.dealId);
      if (!lead) return null;
      return (new Date(d.closeDate).getTime() - new Date(lead.createdDate).getTime()) / 86400000;
    }).filter(Boolean) as number[];
    return days.length > 0 ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : 0;
  }, [prevWonDeals, ENQUIRY_DATA]);

  const convertedLeads = weekLeads.filter(e => e.status === 'Converted').length;
  const prevConvertedLeads = prevLeads.filter(e => e.status === 'Converted').length;
  const leadConversionRate = weekLeads.length > 0 ? (convertedLeads / weekLeads.length) * 100 : 0;
  const prevLeadConversionRate = prevLeads.length > 0 ? (prevConvertedLeads / prevLeads.length) * 100 : 0;

  const kpis = [
    { title: 'Revenue Won', value: formatCurrencyShort(revenueWon), prevValue: formatCurrencyShort(prevRevenueWon), change: percentChange(revenueWon, prevRevenueWon), icon: <TrendingUp className="h-4 w-4" /> },
    { title: 'Pipeline Value', value: formatCurrencyShort(pipelineValue), prevValue: formatCurrencyShort(prevPipelineValue), change: percentChange(pipelineValue, prevPipelineValue), icon: <BarChart3 className="h-4 w-4" /> },
    { title: 'Win Rate', value: `${winRate.toFixed(0)}%`, prevValue: `${prevWinRate.toFixed(0)}%`, change: percentChange(winRate, prevWinRate), icon: <CheckCircle className="h-4 w-4" /> },
    { title: 'Avg Deal Size', value: formatCurrencyShort(avgDealSize), prevValue: formatCurrencyShort(prevAvgDealSize), change: percentChange(avgDealSize, prevAvgDealSize), icon: <Target className="h-4 w-4" /> },
    { title: 'Sales Cycle', value: `${salesCycleDays} days`, prevValue: `${prevSalesCycleDays} days`, change: percentChange(salesCycleDays, prevSalesCycleDays), positive: false, icon: <Clock className="h-4 w-4" /> },
    { title: 'Lead Conversion', value: `${leadConversionRate.toFixed(0)}%`, prevValue: `${prevLeadConversionRate.toFixed(0)}%`, change: percentChange(leadConversionRate, prevLeadConversionRate), icon: <Activity className="h-4 w-4" /> },
  ];

  // ========== Revenue & Pipeline calculations ==========
  const ANNUAL_TARGET = 50000000;
  const revenueClosed = DEAL_DATA.filter(d => d.stage === 'Win').reduce((s, d) => s + d.negotiatedAmount, 0);
  const weightedPipeline = DEAL_DATA.filter(d => d.stage === 'Negotiation').reduce((s, d) => s + d.expectedAmount * 0.6, 0);
  const forecastedRevenue = revenueClosed + weightedPipeline;
  const targetAchievement = (forecastedRevenue / ANNUAL_TARGET) * 100;

  // ========== SECTION 3: Simplified Funnel ==========
  const funnelLeads = weekLeads.length;
  const funnelConverted = weekLeads.filter(e => e.status === 'Converted').length;
  const funnelDeals = weekDeals.length;
  const funnelWon = wonDeals.length;

  const simpleFunnel = [
    { name: 'Leads', count: funnelLeads, color: 'hsl(174,83%,32%)' },
    { name: 'Converted', count: funnelConverted, color: 'hsl(160,84%,39%)' },
    { name: 'Deals', count: funnelDeals, color: 'hsl(38,92%,50%)' },
    { name: 'Won', count: funnelWon, color: 'hsl(217,91%,60%)' },
  ];

  const funnelConversions = simpleFunnel.slice(0, -1).map((stage, i) => {
    const next = simpleFunnel[i + 1];
    const rate = stage.count > 0 ? (next.count / stage.count) * 100 : 0;
    return { from: stage.name, to: next.name, rate, drop: 100 - rate };
  });
  const biggestLeakage = funnelConversions.reduce((worst, c) => c.drop > worst.drop ? c : worst, funnelConversions[0]);
  const maxFunnelCount = Math.max(...simpleFunnel.map(s => s.count), 1);

  // ========== SECTION 4: Pipeline Health ==========
  const pipelineByStage = useMemo(() => {
    const stages = ['Negotiation', 'Commercial Proposal', 'Closed'];
    return stages.map(stage => {
      const deals = weekDeals.filter(d => d.stage === stage);
      return { stage, deals: deals.length, value: deals.reduce((s, d) => s + d.expectedAmount, 0) };
    }).filter(s => s.deals > 0);
  }, [weekDeals]);

  const totalPipelineActive = DEAL_DATA.filter(d => !['Win', 'Lost', 'Cancel'].includes(d.stage))
    .reduce((s, d) => s + d.expectedAmount, 0);
  const pipelineCoverage = ANNUAL_TARGET > 0 ? ((totalPipelineActive + revenueClosed) / ANNUAL_TARGET) : 0;

  // ========== SECTION 5: Service Pillar ==========
  const servicePillarData = useMemo(() => {
    const pillars = [...new Set(ENQUIRY_DATA.map(e => e.pillar))];
    return pillars.map(pillar => {
      const leads = weekLeads.filter(e => e.pillar === pillar).length;
      const deals = wonDeals.filter(d => d.pillar === pillar);
      const revenue = deals.reduce((s, d) => s + d.negotiatedAmount, 0);
      const allPillarDeals = weekDeals.filter(d => d.pillar === pillar);
      const pillarDecided = allPillarDeals.filter(d => ['Win', 'Lost', 'Cancel'].includes(d.stage));
      const wr = pillarDecided.length > 0 ? (deals.length / pillarDecided.length) * 100 : 0;
      return { pillar, leads, dealsWon: deals.length, revenue, winRate: wr };
    }).filter(s => s.leads > 0 || s.dealsWon > 0).sort((a, b) => b.revenue - a.revenue);
  }, [weekLeads, wonDeals, weekDeals, ENQUIRY_DATA]);

  const revenueByPillar = servicePillarData.filter(s => s.revenue > 0).map(s => ({
    name: s.pillar,
    value: s.revenue,
  }));

  // ========== SECTION 6: Trend Over Time ==========
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
      const bucketLeads = ENQUIRY_DATA.filter(e => isInRange(e.createdDate, mon, bucketEnd));
      const bucketConverted = bucketLeads.filter(e => e.status === 'Converted');
      const bucketDeals = DEAL_DATA.filter(d => isInRange(d.closeDate, mon, bucketEnd));
      const bucketWon = bucketDeals.filter(d => d.stage === 'Win');
      weeks.push({
        week: label,
        leads: bucketLeads.length,
        converted: bucketConverted.length,
        deals: bucketDeals.length,
        won: bucketWon.length,
        revenue: bucketWon.reduce((s, d) => s + d.negotiatedAmount, 0),
      });
      current += 7 * 86400000;
    }
    return weeks;
  }, [weekStart, end, ENQUIRY_DATA, DEAL_DATA]);

  // ========== SECTION 8: Bottleneck ==========
  const stuckDeals = useMemo(() => {
    const today = new Date('2025-10-07');
    return DEAL_DATA.filter(d => !['Win', 'Lost', 'Cancel'].includes(d.stage)).map(d => {
      const daysInStage = Math.abs(Math.round((today.getTime() - new Date(d.closeDate).getTime()) / 86400000));
      return { ...d, daysInStage };
    });
  }, [DEAL_DATA]);

  const stuckByStage = useMemo(() => {
    const map: Record<string, number> = {};
    stuckDeals.forEach(d => { map[d.stage] = (map[d.stage] || 0) + 1; });
    return Object.entries(map).map(([stage, count]) => ({ stage, count }));
  }, [stuckDeals]);

  // ========== SECTION 9: Insights ==========
  const insights = useMemo(() => {
    const items: string[] = [];
    const revChange = percentChange(revenueWon, prevRevenueWon);
    if (revChange.direction === 'up') items.push(`Revenue won increased by ${revChange.value.toFixed(0)}% compared to previous period.`);
    else if (revChange.direction === 'down') items.push(`Revenue won decreased by ${revChange.value.toFixed(0)}% compared to previous period — needs attention.`);

    const lcChange = percentChange(leadConversionRate, prevLeadConversionRate);
    if (lcChange.direction === 'up') items.push(`Lead conversion rate improved by ${lcChange.value.toFixed(0)}% this period.`);

    if (servicePillarData.length > 0) {
      const topByLeads = [...servicePillarData].sort((a, b) => b.leads - a.leads)[0];
      const topByRev = servicePillarData[0];
      if (topByLeads.pillar !== topByRev.pillar && topByLeads.leads > 0) {
        items.push(`${topByLeads.pillar} generates the most leads but ${topByRev.pillar} drives the highest revenue.`);
      }
    }

    items.push(`Pipeline coverage is currently ${pipelineCoverage.toFixed(1)}x — ${pipelineCoverage >= 1.5 ? 'healthy' : pipelineCoverage >= 1.0 ? 'adequate' : 'at risk'}.`);

    if (biggestLeakage && biggestLeakage.drop > 20) {
      items.push(`Biggest funnel leakage at ${biggestLeakage.from} → ${biggestLeakage.to} stage (${biggestLeakage.drop.toFixed(0)}% drop-off).`);
    }

    if (targetAchievement < 100) {
      items.push(`Forecasted revenue is ${targetAchievement.toFixed(0)}% of annual target — ${targetAchievement >= 90 ? 'on track' : 'action needed'}.`);
    } else {
      items.push(`Forecasted revenue exceeds annual target at ${targetAchievement.toFixed(0)}%.`);
    }

    return items;
  }, [revenueWon, prevRevenueWon, leadConversionRate, prevLeadConversionRate, servicePillarData, pipelineCoverage, biggestLeakage, targetAchievement]);

  return (
    <div className="space-y-6">
      {/* Period comparison label */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="bg-muted px-2 py-1 rounded">
          {weekStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – {end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
        <span>compared to previous equal period</span>
      </div>

      {/* SECTION 1: Executive KPI Cards */}
      <div className="grid grid-cols-6 gap-3">
        {kpis.map(kpi => (
          <div key={kpi.title} className="bg-card rounded-lg border p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">{kpi.title}</span>
              <span className="text-muted-foreground">{kpi.icon}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{kpi.value}</p>
            <div className="mt-2 space-y-0.5">
              <TrendBadge change={kpi.change} />
              <p className="text-xs text-muted-foreground">{kpi.prevValue}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Operational Pipeline Strip */}
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

        // Full ordered pipeline: Total Leads → Converted → Proposal → Negotiation → Total Deals → Won → Lost → Cancelled → Closed
        const stages = [
          { name: 'Total Leads', current: weekLeads.length, prev: prevLeads.length, positive: true, color: 'hsl(174,83%,32%)' },
          { name: 'Converted', current: convertedCount, prev: prevConverted, positive: true, color: 'hsl(160,84%,39%)' },
          { name: 'Total Deals', current: weekDeals.length, prev: prevDeals.length, positive: true, color: 'hsl(38,92%,50%)' },
          { name: 'Proposal', current: proposalDeals.length, prev: prevProposalDeals.length, positive: true, color: 'hsl(280,70%,55%)' },
          { name: 'Negotiation', current: negDeals.length, prev: prevNegDeals.length, positive: true, color: 'hsl(262,83%,58%)' },
          { name: 'Won', current: wonDeals.length, prev: prevWonDeals.length, positive: true, color: 'hsl(217,91%,60%)' },
          { name: 'Lost', current: lostDeals.length, prev: prevLostDeals.length, positive: false, color: 'hsl(0,84%,60%)' },
          { name: 'Cancelled', current: cancelDeals.length, prev: prevCancelDeals.length, positive: false, color: 'hsl(25,95%,53%)' },
          { name: 'Closed', current: closedDeals.length, prev: prevClosedDeals.length, positive: true, color: 'hsl(200,70%,50%)' },
        ];

        // Compute conversion rates between adjacent stages
        const convRates = stages.slice(0, -1).map((s, i) => {
          const next = stages[i + 1];
          if (s.current === 0) return null;
          return ((next.current / s.current) * 100).toFixed(0);
        });

        // Generate insight line
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
                const isGood = change.direction === 'flat' ? true
                  : stage.positive ? change.direction === 'up' : change.direction === 'down';
                const deltaColor = change.direction === 'flat' ? 'text-muted-foreground' : isGood ? 'text-success' : 'text-destructive';

                return (
                  <div key={stage.name} className="flex items-stretch flex-1 min-w-0">
                    {/* Arrow + conversion rate between stages */}
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
                    {/* Stage block */}
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
                            <div className={`flex items-center gap-1 text-[10px] font-medium ${deltaColor}`}>
                              {change.direction === 'up' && <TrendingUp className="h-2.5 w-2.5" />}
                              {change.direction === 'down' && <TrendingDown className="h-2.5 w-2.5" />}
                              {change.direction === 'flat' && <Minus className="h-2.5 w-2.5" />}
                              <span>{absDelta >= 0 ? '+' : ''}{absDelta}</span>
                              <span>({change.value.toFixed(1)}%)</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Insight line */}
            <div className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
              <Lightbulb className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <span>{insightLine}</span>
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-2 gap-4">
        {/* SECTION 3: Simplified Sales Funnel */}
        <div className="bg-card rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">Sales Funnel Conversion</h3>
          <div className="space-y-4">
            {simpleFunnel.map((stage, i) => {
              const widthPct = maxFunnelCount > 0 ? (stage.count / maxFunnelCount) * 100 : 0;
              const conversion = i > 0 ? funnelConversions[i - 1] : null;
              return (
                <div key={stage.name}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">{stage.name}</span>
                      {conversion && (
                        <span className="text-muted-foreground">
                          {conversion.rate.toFixed(0)}% from {conversion.from}
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-foreground text-sm">{stage.count}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-7 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all flex items-center justify-end pr-3"
                      style={{
                        width: `${Math.max(widthPct, 8)}%`,
                        backgroundColor: stage.color,
                      }}
                    >
                      {widthPct > 15 && (
                        <span className="text-xs font-bold text-white">{stage.count}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {biggestLeakage && biggestLeakage.drop > 10 && (
            <div className="mt-4 bg-destructive/10 rounded px-3 py-2 text-xs text-destructive flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Biggest drop occurs between {biggestLeakage.from} → {biggestLeakage.to} stage ({biggestLeakage.drop.toFixed(0)}% drop)
            </div>
          )}
        </div>

        {/* SECTION 4: Pipeline Health */}
        <div className="bg-card rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">Pipeline Health</h3>
          {pipelineByStage.length > 0 ? (
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-b">
                  <th className="text-left text-xs font-medium text-muted-foreground pb-2">Stage</th>
                  <th className="text-center text-xs font-medium text-muted-foreground pb-2">Deals</th>
                  <th className="text-right text-xs font-medium text-muted-foreground pb-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {pipelineByStage.map(s => (
                  <tr key={s.stage} className="border-b last:border-0">
                    <td className="py-2 font-medium">{s.stage}</td>
                    <td className="py-2 text-center">{s.deals}</td>
                    <td className="py-2 text-right font-mono">{formatCurrencyShort(s.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-muted-foreground mb-4">No active pipeline deals in selected period.</p>
          )}

          {stuckDeals.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2">
                <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                Deals Requiring Attention
              </div>
              <div className="space-y-1.5">
                {stuckByStage.map(s => (
                  <div key={s.stage} className="flex items-center justify-between text-xs bg-warning/10 rounded px-3 py-1.5">
                    <span className="font-medium">{s.stage}</span>
                    <span className="font-bold text-warning">{s.count} deal{s.count > 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 5: Service Pillar Performance */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">Service Pillar Performance</h3>
          {servicePillarData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-zebra">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs font-medium text-muted-foreground pb-2">Service</th>
                    <th className="text-center text-xs font-medium text-muted-foreground pb-2">Leads</th>
                    <th className="text-center text-xs font-medium text-muted-foreground pb-2">Won</th>
                    <th className="text-right text-xs font-medium text-muted-foreground pb-2">Revenue</th>
                    <th className="text-center text-xs font-medium text-muted-foreground pb-2">Win %</th>
                  </tr>
                </thead>
                <tbody>
                  {servicePillarData.map(s => (
                    <tr key={s.pillar} className="border-b last:border-0">
                      <td className="py-2 font-medium">{s.pillar}</td>
                      <td className="py-2 text-center">{s.leads}</td>
                      <td className="py-2 text-center">{s.dealsWon}</td>
                      <td className="py-2 text-right font-mono">{formatCurrencyShort(s.revenue)}</td>
                      <td className="py-2 text-center">{s.winRate.toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No service data for selected period.</p>
          )}
        </div>

        <div className="bg-card rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">Revenue Contribution by Service</h3>
          {revenueByPillar.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={revenueByPillar} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
                <XAxis type="number" fontSize={11} tickFormatter={v => formatCurrencyShort(v)} />
                <YAxis type="category" dataKey="name" width={90} fontSize={11} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Revenue" radius={[0, 4, 4, 0]}>
                  {revenueByPillar.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted-foreground">No revenue data for selected period.</p>
          )}
        </div>
      </div>

      {/* SECTION 6: Trend Over Time */}
      <div className="bg-card rounded-lg border p-5">
        <h3 className="text-sm font-semibold mb-4">Revenue & Deal Trend Over Time</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={weeklyActivity}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
            <XAxis dataKey="week" fontSize={11} />
            <YAxis yAxisId="left" fontSize={11} />
            <YAxis yAxisId="right" orientation="right" fontSize={11} tickFormatter={v => formatCurrencyShort(v)} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Line yAxisId="left" type="monotone" dataKey="leads" name="Leads" stroke="hsl(174,83%,32%)" strokeWidth={2} dot={{ r: 3 }} />
            <Line yAxisId="left" type="monotone" dataKey="converted" name="Converted" stroke="hsl(160,84%,39%)" strokeWidth={2} dot={{ r: 3 }} />
            <Line yAxisId="left" type="monotone" dataKey="deals" name="Deals" stroke="hsl(38,92%,50%)" strokeWidth={2} dot={{ r: 3 }} />
            <Line yAxisId="left" type="monotone" dataKey="won" name="Won" stroke="hsl(217,91%,60%)" strokeWidth={2} dot={{ r: 3 }} />
            <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(262,83%,58%)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* SECTION 9: Key Insights */}
      <div className="bg-accent/50 rounded-lg border border-primary/20 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Key Insights</h3>
        </div>
        <ul className="space-y-2">
          {insights.map((insight, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
              <span className="text-primary mt-0.5">•</span>
              {insight}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
