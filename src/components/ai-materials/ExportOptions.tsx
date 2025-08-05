import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, Table } from 'lucide-react';
import { toast } from 'sonner';

interface ExportOptionsProps {
  estimate?: {
    materials: any[];
    totalCost: number;
    breakdown: any;
    currency: string;
  };
}

export function ExportOptions({ estimate }: ExportOptionsProps) {
  const handleExportPDF = () => {
    if (!estimate) {
      toast.error('Geen data om te exporteren');
      return;
    }
    
    // TODO: Implement PDF export
    toast.info('PDF export wordt binnenkort beschikbaar');
  };

  const handleExportCSV = () => {
    if (!estimate) {
      toast.error('Geen data om te exporteren');
      return;
    }
    
    // TODO: Implement CSV export
    toast.info('CSV export wordt binnenkort beschikbaar');
  };

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        className="w-full justify-start gap-2"
        onClick={handleExportPDF}
        disabled={!estimate}
      >
        <FileText className="h-4 w-4" />
        Exporteer als PDF
      </Button>
      
      <Button
        variant="outline"
        className="w-full justify-start gap-2"
        onClick={handleExportCSV}
        disabled={!estimate}
      >
        <Table className="h-4 w-4" />
        Exporteer als CSV
      </Button>
      
      <div className="text-xs text-muted-foreground pt-2">
        Export functies komen binnenkort beschikbaar
      </div>
    </div>
  );
}