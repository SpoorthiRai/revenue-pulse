import { useState } from 'react';
import { WeekProvider, useWeek } from '@/context/WeekContext';
import { AppSidebar, ViewId } from '@/components/AppSidebar';
import { AppHeader } from '@/components/AppHeader';
import { ExecutiveSummaryView } from '@/views/ExecutiveSummaryView';
import { PipelineView } from '@/views/PipelineView';
import { ContractsView } from '@/views/ContractsView';
import { InvoicingView } from '@/views/InvoicingView';
import { PaymentsView } from '@/views/PaymentsView';
import { TeamPerformanceView } from '@/views/TeamPerformanceView';
import { formatDateShort } from '@/lib/formatters';

function DashboardContent() {
  const [activeView, setActiveView] = useState<ViewId>('executive');
  const { weekStart, weekEnd } = useWeek();

  const weekLabel = `${formatDateShort(weekStart)} – ${formatDateShort(weekEnd)}`;

  const renderView = () => {
    switch (activeView) {
      case 'executive': return <ExecutiveSummaryView />;
      case 'pipeline': return <PipelineView />;
      case 'contracts': return <ContractsView />;
      case 'invoicing': return <InvoicingView />;
      case 'payments': return <PaymentsView />;
      case 'team': return <TeamPerformanceView />;
    }
  };

  return (
    <div className="min-h-screen flex w-full">
      <AppSidebar activeView={activeView} onViewChange={setActiveView} weekLabel={weekLabel} />
      <div className="flex-1 ml-60 flex flex-col">
        <AppHeader activeView={activeView} />
        <main className="flex-1 p-6 overflow-auto">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

const Index = () => (
  <WeekProvider>
    <DashboardContent />
  </WeekProvider>
);

export default Index;
