import { useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { usePillarFilter } from '@/context/PillarFilterContext';
import { KPICard } from '@/components/KPICard';
import { formatCurrencyShort, formatCurrency } from '@/lib/formatters';
import { Users, TrendingUp, Trophy, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

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

interface RepData {
  name: string;
  leads: number;
  converted: number;
  winRate: number;
  dealValueWon: number;
  activePOs: number;
  invoicesRaised: number;
}

export function TeamPerformanceView() {
  const { enquiryData: RAW_ENQ, dealData: RAW_DEALS, poData: RAW_PO, invoiceData: INVOICE_DATA } = useData();
  const { selectedPillar } = usePillarFilter();

  const ENQUIRY_DATA = selectedPillar ? RAW_ENQ.filter(e => e.pillar === selectedPillar) : RAW_ENQ;
  const DEAL_DATA = selectedPillar ? RAW_DEALS.filter(d => d.pillar === selectedPillar) : RAW_DEALS;
  const PO_DATA = selectedPillar ? RAW_PO.filter(p => p.serviceCategory === selectedPillar) : RAW_PO;

  const repData = useMemo<RepData[]>(() => {
    const reps = [...new Set(ENQUIRY_DATA.map(e => e.assignedTo))];
    return reps.map(name => {
      const leads = ENQUIRY_DATA.filter(e => e.assignedTo === name);
      const converted = leads.filter(e => e.status === 'Converted').length;
      const deals = DEAL_DATA.filter(d => d.assignedTo === name);
      const won = deals.filter(d => d.stage === 'Win');
      const decided = deals.filter(d => ['Win', 'Lost', 'Cancel'].includes(d.stage));
      const winRate = decided.length > 0 ? (won.length / decided.length) * 100 : 0;
      const dealValueWon = won.reduce((s, d) => s + d.expectedAmount, 0);

      const wonDealIds = won.map(d => d.dealId);
      const activePOs = PO_DATA.filter(p => wonDealIds.includes(p.dealId) && p.status === 'Active').length;
      const repPONumbers = PO_DATA.filter(p => wonDealIds.includes(p.dealId)).map(p => p.poNumber);
      const invoicesRaised = INVOICE_DATA.filter(i => repPONumbers.includes(i.poNumber)).length;

      return { name, leads: leads.length, converted, winRate, dealValueWon, activePOs, invoicesRaised };
    }).sort((a, b) => b.leads - a.leads);
  }, [ENQUIRY_DATA, DEAL_DATA, PO_DATA, INVOICE_DATA]);

  const totalReps = repData.length;
  const totalLeads = ENQUIRY_DATA.length;
  const topRep = repData.length > 0 ? repData.reduce((best, r) => r.dealValueWon > best.dealValueWon ? r : best, repData[0]) : null;
  const totalWonValue = DEAL_DATA.filter(d => d.stage === 'Win').reduce((s, d) => s + d.expectedAmount, 0);

  const leadsPerRep = repData.map(r => ({ name: r.name.split(' ')[0], value: r.leads })).sort((a, b) => b.value - a.value);
  const valuePerRep = repData.filter(r => r.dealValueWon > 0).map(r => ({ name: r.name.split(' ')[0], value: r.dealValueWon })).sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <KPICard title="Active Reps" value={String(totalReps)} icon={<Users className="h-5 w-5" />} />
        <KPICard title="Total Leads" value={String(totalLeads)} icon={<TrendingUp className="h-5 w-5" />} />
        <KPICard title="Top Rep" value={topRep?.name.split(' ')[0] || '-'} icon={<Trophy className="h-5 w-5" />} />
        <KPICard title="Total Won Value" value={formatCurrencyShort(totalWonValue)} icon={<DollarSign className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div style={cardStyle}>
          <h3 style={sectionHeadingStyle}>Leads per Rep</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={leadsPerRep} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
              <XAxis type="number" fontSize={11} tick={{ fill: '#9CA3AF' }} />
              <YAxis type="category" dataKey="name" width={80} fontSize={11} tick={{ fill: '#9CA3AF' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Leads" fill="#0D9488" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={cardStyle}>
          <h3 style={sectionHeadingStyle}>Won Deal Value per Rep</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={valuePerRep} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
              <XAxis type="number" fontSize={11} tick={{ fill: '#9CA3AF' }} tickFormatter={v => formatCurrencyShort(v)} />
              <YAxis type="category" dataKey="name" width={80} fontSize={11} tick={{ fill: '#9CA3AF' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Won Value" fill="#10B981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div className="p-4" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <h3 style={{ ...sectionHeadingStyle, marginBottom: 0 }}>Rep Performance Summary</h3>
        </div>
        <table className="w-full table-zebra">
          <thead>
            <tr>
              <th className="text-left px-4 py-3" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280' }}>Rep Name</th>
              <th className="text-center px-4 py-3" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280' }}>Total Leads</th>
              <th className="text-center px-4 py-3" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280' }}>Converted</th>
              <th className="text-center px-4 py-3" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280' }}>Win Rate %</th>
              <th className="text-right px-4 py-3" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280' }}>Deal Value Won</th>
              <th className="text-center px-4 py-3" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280' }}>Active POs</th>
              <th className="text-center px-4 py-3" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280' }}>Invoices</th>
            </tr>
          </thead>
          <tbody>
            {repData.map(rep => (
              <tr key={rep.name}>
                <td className="px-4 py-2.5 font-medium">{rep.name}</td>
                <td className="px-4 py-2.5 text-center">{rep.leads}</td>
                <td className="px-4 py-2.5 text-center">{rep.converted}</td>
                <td className="px-4 py-2.5 text-center">{rep.winRate.toFixed(0)}%</td>
                <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(rep.dealValueWon)}</td>
                <td className="px-4 py-2.5 text-center">{rep.activePOs}</td>
                <td className="px-4 py-2.5 text-center">{rep.invoicesRaised}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
