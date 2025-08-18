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
          // Get phase budget from project_phases table
          const { data: phaseData } = await import('@/integrations/supabase/client').then(({ supabase }) => 
            supabase
              .from('project_phases')
              .select('budget')
              .eq('id', phase.id)
              .single()
          );

          // Get material costs
          const { data: materialCosts } = await import('@/integrations/supabase/client').then(({ supabase }) => 
            supabase
              .from('phase_material_costs')
              .select('total_cost')
              .eq('phase_id', phase.id)
          );

          // Get labor costs
          const { data: laborCosts } = await import('@/integrations/supabase/client').then(({ supabase }) => 
            supabase
              .from('phase_labor_costs')
              .select('total_actual_cost')
              .eq('phase_id', phase.id)
          );

          // Get expenses
          const { data: expenses } = await import('@/integrations/supabase/client').then(({ supabase }) => 
            supabase
              .from('phase_expenses')
              .select('amount')
              .eq('phase_id', phase.id)
          );

          // Calculate totals
          const materialTotal = materialCosts?.reduce((sum, item) => sum + (item.total_cost || 0), 0) || 0;
          const laborTotal = laborCosts?.reduce((sum, item) => sum + (item.total_actual_cost || 0), 0) || 0;
          const expenseTotal = expenses?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
          const totalCommitted = materialTotal + laborTotal + expenseTotal;
          const budget = phaseData?.budget || 0;
          const variance = budget ? budget - totalCommitted : null;

          costMap.set(phase.id, {
            budget,
            material_cost: materialTotal,
            labor_cost_actual: laborTotal,
            expense_cost: expenseTotal,
            total_committed: totalCommitted,
            variance,
          });
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