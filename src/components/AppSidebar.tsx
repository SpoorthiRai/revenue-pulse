import { LayoutDashboard, TrendingUp, FileText, Users, Circle } from 'lucide-react';

export type ViewId = 'executive' | 'pipeline' | 'contracts' | 'team';

interface SidebarProps {
  activeView: ViewId;
  onViewChange: (v: ViewId) => void;
  weekLabel: string;
}

const NAV_ITEMS: { id: ViewId; label: string; icon: React.ElementType }[] = [
  { id: 'executive', label: 'Executive Summary', icon: LayoutDashboard },
  { id: 'pipeline', label: 'Pipeline', icon: TrendingUp },
  { id: 'contracts', label: 'PO & Contracts', icon: FileText },
  { id: 'team', label: 'Team Performance', icon: Users },
];

export function AppSidebar({ activeView, onViewChange, weekLabel }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 flex flex-col z-50" style={{ backgroundColor: '#0F172A' }}>
      <div className="p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2">
          <Circle className="h-2.5 w-2.5 fill-current" style={{ color: '#14B8A6' }} />
          <h1 className="text-base font-semibold text-white tracking-tight">Deal-to-Billing Ops</h1>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {NAV_ITEMS.map(item => {
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
              style={{
                backgroundColor: active ? '#1E293B' : 'transparent',
                color: active ? '#FFFFFF' : '#94A3B8',
                fontWeight: active ? 500 : 400,
                borderLeft: active ? '3px solid #14B8A6' : '3px solid transparent',
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1E293B';
                  (e.currentTarget as HTMLButtonElement).style.color = '#FFFFFF';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = '#94A3B8';
                }
              }}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[10px] font-normal" style={{ color: '#475569' }}>Week of</p>
        <p className="text-sm text-white font-medium mt-0.5">{weekLabel}</p>
      </div>
    </aside>
  );
}
