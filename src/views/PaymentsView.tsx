import { useMemo } from 'react';
import { INVOICE_DATA } from '@/data/constants';
import { KPICard } from '@/components/KPICard';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCurrencyShort, formatCurrency } from '@/lib/formatters';
import { DollarSign, Wallet, AlertCircle, TrendingUp, Bell } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Line, ComposedChart, Legend
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

export function PaymentsView() {
  const now = new Date('2025-10-07');

  const totalBilled = INVOICE_DATA.reduce((s, i) => s + i.amount, 0);
  const totalCollected = INVOICE_DATA.reduce((s, i) => s + i.amountReceived, 0);
  const outstanding = totalBilled - totalCollected;
  const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;

  // Monthly cash collection
  const monthlyData = useMemo(() => {
    const months: Record<string, { collected: number; cumulative: number }> = {};
    const sorted = [...INVOICE_DATA].filter(i => i.receivedDate).sort((a, b) => new Date(a.receivedDate!).getTime() - new Date(b.receivedDate!).getTime());
    let cumulative = 0;
    sorted.forEach(inv => {
      const d = new Date(inv.receivedDate!);
      const key = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      if (!months[key]) months[key] = { collected: 0, cumulative: 0 };
      months[key].collected += inv.amountReceived;
      cumulative += inv.amountReceived;
      months[key].cumulative = cumulative;
    });
    return Object.entries(months).map(([month, data]) => ({ month, ...data }));
  }, []);

  // Payment status donut
  const paidAmount = INVOICE_DATA.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0);
  const pendingAmount = INVOICE_DATA.filter(i => i.status !== 'Paid').reduce((s, i) => s + i.balance, 0);
  const donutData = [
    { name: 'Paid', value: paidAmount },
    { name: 'Pending', value: pendingAmount },
  ];

  // Outstanding invoices
  const pendingInvoices = INVOICE_DATA.filter(i => i.status !== 'Paid' && i.balance > 0)
    .map(i => {
      const daysOutstanding = Math.round((now.getTime() - new Date(i.dueDate).getTime()) / 86400000);
      return { ...i, daysOutstanding };
    })
    .sort((a, b) => b.daysOutstanding - a.daysOutstanding);

  // Customer summary
  const customerSummary = useMemo(() => {
    const map: Record<string, { billed: number; collected: number; outstanding: number }> = {};
    INVOICE_DATA.forEach(inv => {
      if (!map[inv.customer]) map[inv.customer] = { billed: 0, collected: 0, outstanding: 0 };
      map[inv.customer].billed += inv.amount;
      map[inv.customer].collected += inv.amountReceived;
      map[inv.customer].outstanding += inv.balance;
    });
    return Object.entries(map).map(([customer, data]) => ({ customer, ...data }));
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <KPICard title="Total Billed" value={formatCurrencyShort(totalBilled)} icon={<DollarSign className="h-5 w-5 text-primary" />} />
        <KPICard title="Total Collected" value={formatCurrencyShort(totalCollected)} icon={<Wallet className="h-5 w-5 text-success" />} />
        <KPICard title="Outstanding Balance" value={formatCurrencyShort(outstanding)} icon={<AlertCircle className="h-5 w-5 text-warning" />} />
        <KPICard title="Collection Rate" value={`${collectionRate.toFixed(1)}%`} icon={<TrendingUp className="h-5 w-5 text-primary" />} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">Monthly Cash Collection</h3>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis yAxisId="left" fontSize={11} tickFormatter={v => formatCurrencyShort(v)} />
              <YAxis yAxisId="right" orientation="right" fontSize={11} tickFormatter={v => formatCurrencyShort(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="collected" name="Monthly" fill="#0D9488" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="cumulative" name="Cumulative" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-4">Payment Status</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={3} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                <Cell fill="#10B981" />
                <Cell fill="#F59E0B" />
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" className="text-xs fill-muted-foreground">Outstanding</text>
              <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" className="text-sm font-bold fill-foreground">{formatCurrencyShort(pendingAmount)}</text>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Outstanding payments table */}
      <div className="bg-card rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold">Outstanding Payments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-zebra">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Invoice #</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Customer</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Balance</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Due Date</th>
                <th className="text-center px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Days Out</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingInvoices.map(inv => (
                <tr key={inv.invoiceNumber} className={`border-b ${inv.daysOutstanding > 0 ? 'bg-destructive/5' : ''}`}>
                  <td className="px-4 py-2 font-mono text-xs">{inv.invoiceNumber}</td>
                  <td className="px-4 py-2">{inv.customer}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatCurrency(inv.balance)}</td>
                  <td className="px-4 py-2">{inv.dueDate}</td>
                  <td className={`px-4 py-2 text-center font-medium ${inv.daysOutstanding > 0 ? 'text-destructive' : ''}`}>{inv.daysOutstanding}</td>
                  <td className="px-4 py-2"><StatusBadge status={inv.daysOutstanding > 0 ? 'Overdue' : inv.status} /></td>
                  <td className="px-4 py-2">
                    <button className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                      <Bell className="h-3 w-3" /> Remind
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer summary */}
      <div className="bg-card rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold">Per-Customer Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-zebra">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Customer</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Total Billed</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Collected</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {customerSummary.map(c => (
                <tr key={c.customer} className="border-b">
                  <td className="px-4 py-2 font-medium">{c.customer}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatCurrency(c.billed)}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatCurrency(c.collected)}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatCurrency(c.outstanding)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
