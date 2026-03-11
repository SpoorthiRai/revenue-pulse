import { getStatusBadgeClass } from '@/lib/formatters';

export function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge ${getStatusBadgeClass(status)}`}>{status}</span>;
}
