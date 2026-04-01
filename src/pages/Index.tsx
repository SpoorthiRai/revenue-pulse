import { useState } from 'react';
import { WeekProvider, useWeek } from '@/context/WeekContext';
import { DataProvider, useData } from '@/context/DataContext';
import { PillarFilterProvider, usePillarFilter } from '@/context/PillarFilterContext';
import { AppSidebar, ViewId } from '@/components/AppSidebar';
import { AppHeader } from '@/components/AppHeader';
import { ExecutiveSummaryView } from '@/views/ExecutiveSummaryView';
import { PipelineView } from '@/views/PipelineView';
import { ContractsView } from '@/views/ContractsView';
import { TeamPerformanceView } from '@/views/TeamPerformanceView';
import { formatDateShort } from '@/lib/formatters';
import { X } from 'lucide-react';

function DashboardContent() {
  const [activeView, setActiveView] = useState<ViewId>('executive');
  const { weekStart, weekEnd } = useWeek();
  const { isLoading } = useData();

  const { selectedPillar, setSelectedPillar } = usePillarFilter();
  const weekLabel = `${formatDateShort(weekStart)} – ${formatDateShort(weekEnd)}`;

  const renderView = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground text-sm">Loading data...</div>
        </div>
      );
    }
    switch (activeView) {
      case 'executive': return <ExecutiveSummaryView />;
      case 'pipeline': return <PipelineView />;
      case 'contracts': return <ContractsView />;
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
  <DataProvider>
    <WeekProvider>
      <DashboardContent />
    </WeekProvider>
  </DataProvider>
);

export default Index;
