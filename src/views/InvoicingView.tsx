import { useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { useWeek } from '@/context/WeekContext';
import { KPICard } from '@/components/KPICard';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { formatCurrencyShort, formatCurrency } from '@/lib/formatters';
import { Receipt, FileEdit, Send, CheckCircle, AlertTriangle } from 'lucide-react';

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

export function InvoicingView() {
  const { invoiceData: INVOICE_DATA } = useData();
  const { weekStart, weekEnd } = useWeek();

  const totalInvoiced = INVOICE_DATA.reduce((s, i) => s + i.amount, 0);
  const drafts = INVOICE_DATA.filter(i => i.status === 'Draft');
  const sent = INVOICE_DATA.filter(i => i.status === 'Invoice Sent');
  const paid = INVOICE_DATA.filter(i => i.status === 'Paid');

  const funnelStages = [
    { name: 'Draft', count: drafts.length, value: drafts.reduce((s, i) => s + i.amount, 0), fill: '#94A3B8' },
    { name: 'Pending', count: INVOICE_DATA.filter(i => i.status === 'Pending').length, value: INVOICE_DATA.filter(i => i.status === 'Pending').reduce((s, i) => s + i.amount, 0), fill: '#F59E0B' },
    { name: 'Sent', count: sent.length, value: sent.reduce((s, i) => s + i.amount, 0), fill: '#3B82F6' },
    { name: 'Paid', count: paid.length, value: paid.reduce((s, i) => s + i.amount, 0), fill: '#10B981' },
  ];

  const cfoPending = INVOICE_DATA.filter(i => i.cfoApproval === 'Pending');

  const now = new Date('2026-03-11');
  const sortedInvoices = [...INVOICE_DATA].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <KPICard title="Total Invoiced" value={formatCurrencyShort(totalInvoiced)} icon={<Receipt className="h-5 w-5 text-primary" />} />
        <KPICard title="Drafts Pending" value={String(drafts.length)} icon={<FileEdit className="h-5 w-5 text-muted-foreground" />} />
        <KPICard title="Invoice Sent" value={String(sent.length)} icon={<Send className="h-5 w-5 text-primary" />} />
        <KPICard title="Payment Received" value={String(paid.length)} icon={<CheckCircle className="h-5 w-5 text-success" />} />
      </div>

      <div className="bg-card rounded-lg border p-5">
        <h3 className="text-sm font-semibold mb-4">Invoice Stage Funnel</h3>
        <div className="flex items-end gap-2 h-40">
          {funnelStages.map((stage) => {
            const maxVal = Math.max(...funnelStages.map(s => s.value));
            const heightPct = maxVal > 0 ? (stage.value / maxVal) * 100 : 0;
            return (
              <div key={stage.name} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium">{stage.count}</span>
                <span className="text-[10px] text-muted-foreground">{formatCurrencyShort(stage.value)}</span>
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{ height: `${Math.max(heightPct, 8)}%`, backgroundColor: stage.fill }}
                />
                <span className="text-xs font-medium mt-1">{stage.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {cfoPending.length > 0 && (
        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-semibold">CFO Approval Pending ({cfoPending.length})</h3>
          </div>
          <table className="w-full text-sm table-zebra">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Invoice #</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Customer</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Amount</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Due Date</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {cfoPending.map(inv => (
                <tr key={inv.invoiceNumber} className="border-b">
                  <td className="px-4 py-2 font-mono text-xs">{inv.invoiceNumber}</td>
                  <td className="px-4 py-2">{inv.customer}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatCurrency(inv.amount)}</td>
                  <td className="px-4 py-2">{inv.dueDate}</td>
                  <td className="px-4 py-2"><StatusBadge status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-card rounded-lg border overflow-x-auto">
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold">All Invoices</h3>
        </div>
        <table className="w-full text-sm table-zebra">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Invoice #</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">PO #</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Customer</th>
              <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Amount</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Invoice Date</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Due Date</th>
              <th className="text-center px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Days to Due</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Status</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">CFO</th>
            </tr>
          </thead>
          <tbody>
            {sortedInvoices.map(inv => {
              const daysToDue = Math.round((new Date(inv.dueDate).getTime() - now.getTime()) / 86400000);
              const isUrgent = daysToDue < 7 && inv.status !== 'Paid';
              return (
                <tr key={inv.invoiceNumber} className="border-b">
                  <td className="px-4 py-2 font-mono text-xs">{inv.invoiceNumber}</td>
                  <td className="px-4 py-2 font-mono text-xs">{inv.poNumber}</td>
                  <td className="px-4 py-2">{inv.customer}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatCurrency(inv.amount)}</td>
                  <td className="px-4 py-2">{inv.invoiceDate}</td>
                  <td className="px-4 py-2">{inv.dueDate}</td>
                  <td className={`px-4 py-2 text-center font-medium ${isUrgent ? 'text-destructive' : 'text-foreground'}`}>{daysToDue}</td>
                  <td className="px-4 py-2"><StatusBadge status={inv.status} /></td>
                  <td className="px-4 py-2"><StatusBadge status={inv.cfoApproval} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
