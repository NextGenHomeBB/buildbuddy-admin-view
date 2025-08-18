import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { calendarExportService } from '@/services/calendarExport.service';
import { ProjectPhase } from '@/hooks/usePhases';
import { usePhaseCosts } from '@/hooks/usePhaseCosts';
import { useQuery } from '@tanstack/react-query';

interface UseCalendarExportProps {
  phases: ProjectPhase[];
  projectName: string;
}

interface PhaseCostData {
  budget: number | null;
  material_cost: number;
  labor_cost_actual: number;
  expense_cost: number;
  total_committed: number;
  variance: number | null;
}

export function useCalendarExport({ phases, projectName }: UseCalendarExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  // Validate if export is possible
  const canExport = calendarExportService.validateExportData(phases);

  // Fetch cost data for all phases
  const { data: costDataMap } = useQuery({
    queryKey: ['phase-costs-map', phases.map(p => p.id)],
    queryFn: async (): Promise<Map<string, PhaseCostData>> => {
      const costMap = new Map<string, PhaseCostData>();
      
      // Fetch cost data for each phase in parallel
      const costPromises = phases.map(async (phase) => {
        try {
          const { data } = await import('@/integrations/supabase/client').then(({ supabase }) => 
            supabase
              .from('phase_costs_vw')
              .select('*')
              .eq('phase_id', phase.id)
              .single()
          );
          
          if (data) {
            costMap.set(phase.id, {
              budget: data.budget,
              material_cost: data.material_cost || 0,
              labor_cost_actual: data.labor_cost_actual || 0,
              expense_cost: data.expense_cost || 0,
              total_committed: data.total_committed || 0,
              variance: data.variance,
            });
          }
        } catch (error) {
          console.warn(`Failed to fetch cost data for phase ${phase.id}:`, error);
        }
      });

      await Promise.all(costPromises);
      return costMap;
    },
    enabled: phases.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const exportToCalendar = async () => {
    if (!canExport) {
      toast({
        title: "Export Failed",
        description: "No phases with valid date ranges found to export.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      const icalContent = calendarExportService.generateICalendar(
        phases,
        projectName,
        costDataMap
      );

      calendarExportService.downloadICalendar(icalContent, projectName);

      toast({
        title: "Export Successful",
        description: `Project phases exported to calendar. File downloaded: ${projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-phases-${new Date().toISOString().split('T')[0]}.ics`,
      });
    } catch (error) {
      console.error('Calendar export failed:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export calendar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportToCalendar,
    isExporting,
    canExport,
  };
}