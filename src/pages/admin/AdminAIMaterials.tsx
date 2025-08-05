import React from 'react';
import { MaterialsEstimate } from '@/components/ai-materials/MaterialsEstimate';
import { CostSummary } from '@/components/ai-materials/CostSummary';
import { ExportOptions } from '@/components/ai-materials/ExportOptions';
import { useComputeMaterials } from '@/hooks/useComputeMaterials';
import { usePlanStore } from '@/store/planStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Calculator } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminAIMaterials() {
  const { mutate: computeMaterials, isPending: isComputing, data: estimateData, error } = useComputeMaterials();
  const { activePlanId, activeStyleId } = usePlanStore();

  const handleComputeMaterials = () => {
    if (!activePlanId) {
      toast.error('Selecteer eerst een plattegrond in de AI Indeling tool');
      return;
    }
    computeMaterials();
  };

  if (!activePlanId) {
    return (
      <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Materialen Calculator</h1>
            <p className="text-muted-foreground">
              Bereken materiaalkosten op basis van je plattegrond en stijl
            </p>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Selecteer eerst een plattegrond in de AI Indeling tool om materialen te kunnen berekenen.
            </AlertDescription>
          </Alert>
        </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Materialen Calculator</h1>
            <p className="text-muted-foreground">
              Bereken materiaalkosten op basis van je plattegrond en stijl
            </p>
          </div>
          
          <Button 
            onClick={handleComputeMaterials}
            disabled={isComputing}
            className="flex items-center gap-2"
          >
            <Calculator className="h-4 w-4" />
            {isComputing ? 'Berekenen...' : 'Bereken Materialen'}
          </Button>
        </div>

        {!activeStyleId && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Voor nauwkeurigere berekeningen kun je een stijl selecteren in de AI Styling tool.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Materiaalschatting</CardTitle>
              </CardHeader>
              <CardContent>
                <MaterialsEstimate 
                  estimate={estimateData} 
                  loading={isComputing} 
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Kostenoverzicht</CardTitle>
              </CardHeader>
              <CardContent>
                <CostSummary estimate={estimateData} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Export Opties</CardTitle>
              </CardHeader>
              <CardContent>
                <ExportOptions estimate={estimateData} />
              </CardContent>
            </Card>
          </div>
        </div>
    </div>
  );
}