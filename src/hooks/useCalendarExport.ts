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
      
      // Fetch project costs using secure RPC function
      try {
        const { data: projectCosts } = await import('@/integrations/supabase/client').then(({ supabase }) => 
          supabase.rpc('get_project_costs_secure', { p_project_id: null })
        );
        
        if (projectCosts) {
          // Map project costs to phases - this is simplified since we no longer have phase-level costs
          // In a real implementation, you might need a separate phase costs function
          phases.forEach((phase) => {
            const projectCost = projectCosts.find(pc => pc.project_id === phase.project_id);
            if (projectCost) {
              costMap.set(phase.id, {
                budget: projectCost.budget || 0,
                material_cost: projectCost.total_material_cost || 0,
                labor_cost_actual: projectCost.total_labor_cost || 0,
                expense_cost: projectCost.total_expense_cost || 0,
                total_committed: projectCost.total_cost || 0,
                variance: projectCost.budget_variance || 0,
              });
            }
          });
        }
      } catch (error) {
        console.warn('Failed to fetch cost data:', error);
      }

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