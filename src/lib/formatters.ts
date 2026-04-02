export function formatCurrency(n: number): string {
  return '₹' + n.toLocaleString('en-IN');
}

export function formatCurrencyShort(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}

export function getStatusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (['converted','win','paid','approved','completed'].some(k => s.includes(k))) return 'badge-success';
  if (['pending','negotiation','draft','cfo pending'].some(k => s.includes(k))) return 'badge-warning';
  if (['cancelled','lost','overdue','cancel'].some(k => s.includes(k))) return 'badge-danger';
  if (['invoice sent','active','in progress'].some(k => s.includes(k))) return 'badge-info';
  return 'badge-neutral';
}

export function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getSunday(monday: Date): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function formatDateShort(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function isInRange(dateStr: string | null, start: Date, end: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

export function percentChange(current: number, previous: number): { value: number; direction: 'up' | 'down' | 'flat' | 'no_prior' } {
  if (previous === 0 && current === 0) return { value: 0, direction: 'flat' };
  if (previous === 0) return { value: 0, direction: 'no_prior' };
  const pct = ((current - previous) / previous) * 100;
  return { value: Math.abs(pct), direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' };
}
