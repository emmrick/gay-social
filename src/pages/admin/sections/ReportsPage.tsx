import { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import ReportCard from '@/components/admin/ReportCard';
import { useAdminReports, ReportStatus } from '@/hooks/useAdmin';
import { useActiveTask } from '@/hooks/useModerationTaskQueue';
import type { AdminOutletContext } from '../AdminLayout';

const labels: Record<ReportStatus, string> = {
  pending: 'En attente',
  reviewed: 'En cours',
  resolved: 'Résolus',
  dismissed: 'Rejetés',
};

const ReportsPage = () => {
  const { setSelectedReport } = useOutletContext<AdminOutletContext>();
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | 'all'>('pending');
  const { data: reports, isLoading } = useAdminReports(
    selectedStatus === 'all' ? undefined : selectedStatus,
  );
  const { data: activeTask } = useActiveTask();
  const autoOpened = useRef<string | null>(null);

  useEffect(() => {
    if (
      activeTask?.task_type === 'report_review' &&
      activeTask.target_entity_id &&
      reports?.length &&
      autoOpened.current !== activeTask.target_entity_id
    ) {
      const match = reports.find((r) => r.id === activeTask.target_entity_id);
      if (match) {
        setSelectedReport(match);
        autoOpened.current = activeTask.target_entity_id;
      } else if (selectedStatus !== 'all') {
        setSelectedStatus('all');
      }
    }
  }, [activeTask, reports, selectedStatus, setSelectedReport]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Signalements</h2>
      </div>
      <Tabs value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as ReportStatus | 'all')}>
        <TabsList className="w-full grid grid-cols-5 h-9">
          <TabsTrigger value="pending" className="text-xs">En attente</TabsTrigger>
          <TabsTrigger value="reviewed" className="text-xs">En cours</TabsTrigger>
          <TabsTrigger value="resolved" className="text-xs">Résolus</TabsTrigger>
          <TabsTrigger value="dismissed" className="text-xs">Rejetés</TabsTrigger>
          <TabsTrigger value="all" className="text-xs">Tous</TabsTrigger>
        </TabsList>
        <TabsContent value={selectedStatus} className="mt-3">
          <ScrollArea className="h-[calc(100dvh-280px)]">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            ) : reports?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Aucun signalement {selectedStatus !== 'all' && `avec le statut "${labels[selectedStatus as ReportStatus]}"`}
              </div>
            ) : (
              <div className="space-y-3">
                {reports?.map((report) => (
                  <ReportCard key={report.id} report={report} onClick={() => setSelectedReport(report)} />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;
