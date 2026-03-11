import { LayoutDashboard, TrendingUp, FileText, Receipt, Wallet, Users } from 'lucide-react';

export type ViewId = 'executive' | 'pipeline' | 'contracts' | 'invoicing' | 'payments' | 'team';

interface SidebarProps {
  activeView: ViewId;
  onViewChange: (v: ViewId) => void;
  weekLabel: string;
}

const NAV_ITEMS: { id: ViewId; label: string; icon: React.ElementType }[] = [
  { id: 'executive', label: 'Executive Summary', icon: LayoutDashboard },
  { id: 'pipeline', label: 'Pipeline', icon: TrendingUp },
  { id: 'contracts', label: 'PO & Contracts', icon: FileText },
  { id: 'invoicing', label: 'Invoicing', icon: Receipt },
  { id: 'payments', label: 'Payments', icon: Wallet },
  { id: 'team', label: 'Team Performance', icon: Users },
];

export function AppSidebar({ activeView, onViewChange, weekLabel }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-sidebar flex flex-col z-50">
      <div className="p-5 border-b border-sidebar-border">
        <h1 className="text-lg font-bold text-sidebar-foreground tracking-tight">Deal-to-Billing Ops</h1>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {NAV_ITEMS.map(item => {
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-muted">Week of</p>
        <p className="text-sm text-sidebar-foreground font-medium">{weekLabel}</p>
      </div>
    </aside>
  );
}
