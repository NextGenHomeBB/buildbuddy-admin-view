import { BarChart3 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { OverviewMetrics } from './OverviewMetrics';

interface Stats {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  total_users: number;
  active_users: number;
}

interface OverviewModalProps {
  stats: Stats;
}

export function OverviewModal({ stats }: OverviewModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="default" 
          size="lg"
          className="w-full sm:w-auto flex items-center gap-2"
        >
          <BarChart3 className="h-5 w-5" />
          Overview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            System Overview
          </DialogTitle>
          <DialogDescription>
            Key metrics and statistics for your workspace
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6">
          <OverviewMetrics stats={stats} />
        </div>
      </DialogContent>
    </Dialog>
  );
}