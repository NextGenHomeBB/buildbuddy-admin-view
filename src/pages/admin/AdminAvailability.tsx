import { useState } from 'react';
import { Calendar, Users, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkerAvailabilityTable } from '@/components/admin/WorkerAvailabilityTable';
import { WorkerAvailabilityModal } from '@/components/admin/WorkerAvailabilityModal';
import { useWorkerAvailability, WorkerWithAvailability } from '@/hooks/useWorkerAvailability';

export function AdminAvailability() {
  const [selectedWorker, setSelectedWorker] = useState<WorkerWithAvailability | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  const { data: workers, isLoading, error } = useWorkerAvailability();

  const handleViewWorker = (worker: WorkerWithAvailability) => {
    setSelectedWorker(worker);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedWorker(null);
  };

  // Calculate summary statistics
  const totalWorkers = workers?.length || 0;
  const fullyAvailable = workers?.filter(w => w.available_days_count >= 5).length || 0;
  const partiallyAvailable = workers?.filter(w => w.available_days_count > 0 && w.available_days_count < 5).length || 0;
  const unavailable = workers?.filter(w => w.available_days_count === 0).length || 0;
  const totalWeeklyHours = workers?.reduce((sum, w) => sum + (w.total_weekly_hours || 0), 0) || 0;

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8 text-destructive">
              <AlertTriangle className="h-6 w-6 mr-2" />
              Failed to load worker availability data
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Worker Availability</h1>
        <p className="text-muted-foreground">
          Manage worker schedules, availability patterns, and date-specific overrides
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWorkers}</div>
            <p className="text-xs text-muted-foreground">
              Active workforce
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Full Availability</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{fullyAvailable}</div>
            <p className="text-xs text-muted-foreground">
              5+ days per week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partial Availability</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{partiallyAvailable}</div>
            <p className="text-xs text-muted-foreground">
              1-4 days per week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Weekly Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWeeklyHours}</div>
            <p className="text-xs text-muted-foreground">
              Available capacity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Worker Availability Table */}
      <WorkerAvailabilityTable
        workers={workers || []}
        loading={isLoading}
        onViewWorker={handleViewWorker}
      />

      {/* Worker Detail Modal */}
      <WorkerAvailabilityModal
        worker={selectedWorker}
        open={modalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}