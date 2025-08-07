import { ProjectPhase } from '@/hooks/usePhases';

interface CalendarEvent {
  uid: string;
  summary: string;
  description: string;
  dtstart: string;
  dtend: string;
  status: 'TENTATIVE' | 'CONFIRMED' | 'CANCELLED';
  created: string;
  lastModified: string;
}

interface PhaseCostData {
  budget: number | null;
  material_cost: number;
  labor_cost_actual: number;
  expense_cost: number;
  total_committed: number;
  variance: number | null;
}

export class CalendarExportService {
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  private formatTimestamp(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  }

  private mapStatusToCalendar(status: ProjectPhase['status']): CalendarEvent['status'] {
    switch (status) {
      case 'not_started':
        return 'TENTATIVE';
      case 'in_progress':
      case 'completed':
        return 'CONFIRMED';
      case 'blocked':
        return 'CANCELLED';
      default:
        return 'TENTATIVE';
    }
  }

  private generateUID(phaseId: string, projectId: string): string {
    return `phase-${phaseId}-${projectId}@project-timeline.com`;
  }

  private createDescription(phase: ProjectPhase, costData?: PhaseCostData): string {
    let description = `Project Phase: ${phase.name}`;
    
    if (phase.description) {
      description += `\n\nDescription: ${phase.description}`;
    }

    description += `\n\nStatus: ${phase.status.replace('_', ' ').toUpperCase()}`;
    description += `\nProgress: ${Math.round(phase.progress || 0)}%`;

    if (costData) {
      if (costData.budget) {
        description += `\nBudget: €${costData.budget.toLocaleString()}`;
      }
      if (costData.total_committed > 0) {
        description += `\nCommitted Costs: €${costData.total_committed.toLocaleString()}`;
      }
      if (costData.material_cost > 0) {
        description += `\nMaterial Costs: €${costData.material_cost.toLocaleString()}`;
      }
      if (costData.labor_cost_actual > 0) {
        description += `\nLabor Costs: €${costData.labor_cost_actual.toLocaleString()}`;
      }
      if (costData.expense_cost > 0) {
        description += `\nExpenses: €${costData.expense_cost.toLocaleString()}`;
      }
      if (costData.variance !== null) {
        const varianceText = costData.variance >= 0 ? 'Over' : 'Under';
        description += `\nBudget Variance: ${varianceText} €${Math.abs(costData.variance).toLocaleString()}`;
      }
    }

    return description;
  }

  private createCalendarEvent(phase: ProjectPhase, costData?: PhaseCostData): CalendarEvent | null {
    if (!phase.start_date || !phase.end_date) {
      return null;
    }

    const now = new Date();
    
    return {
      uid: this.generateUID(phase.id, phase.project_id),
      summary: `${phase.name} (${Math.round(phase.progress || 0)}%)`,
      description: this.createDescription(phase, costData),
      dtstart: this.formatDate(phase.start_date),
      dtend: this.formatDate(phase.end_date),
      status: this.mapStatusToCalendar(phase.status),
      created: this.formatTimestamp(new Date(phase.created_at)),
      lastModified: this.formatTimestamp(phase.updated_at ? new Date(phase.updated_at) : now),
    };
  }

  private formatCalendarContent(events: CalendarEvent[]): string {
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Project Timeline//Project Phases//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    events.forEach(event => {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${event.uid}`,
        `DTSTART;VALUE=DATE:${event.dtstart}`,
        `DTEND;VALUE=DATE:${event.dtend}`,
        `SUMMARY:${event.summary}`,
        `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
        `STATUS:${event.status}`,
        `CREATED:${event.created}`,
        `LAST-MODIFIED:${event.lastModified}`,
        'END:VEVENT'
      );
    });

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  public generateICalendar(
    phases: ProjectPhase[], 
    projectName: string,
    costDataMap?: Map<string, PhaseCostData>
  ): string {
    const events = phases
      .map(phase => this.createCalendarEvent(phase, costDataMap?.get(phase.id)))
      .filter((event): event is CalendarEvent => event !== null);

    if (events.length === 0) {
      throw new Error('No phases with valid date ranges found for export');
    }

    return this.formatCalendarContent(events);
  }

  public downloadICalendar(content: string, projectName: string): void {
    const sanitizedName = projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const date = new Date().toISOString().split('T')[0];
    const filename = `${sanitizedName}-phases-${date}.ics`;

    const blob = new Blob([content], { 
      type: 'text/calendar;charset=utf-8' 
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  public validateExportData(phases: ProjectPhase[]): boolean {
    return phases.some(phase => phase.start_date && phase.end_date);
  }
}

export const calendarExportService = new CalendarExportService();