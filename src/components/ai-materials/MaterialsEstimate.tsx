import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface MaterialItem {
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  category: string;
  supplier?: string;
  sku?: string;
}

interface MaterialsEstimateProps {
  estimate?: {
    materials: MaterialItem[];
    totalCost: number;
    breakdown: {
      [category: string]: {
        items: MaterialItem[];
        subtotal: number;
      };
    };
    currency: string;
  };
  loading?: boolean;
}

export function MaterialsEstimate({ estimate, loading }: MaterialsEstimateProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!estimate) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p>Geen materiaalschatting beschikbaar</p>
        <p className="text-sm mt-1">Klik op "Bereken Materialen" om te beginnen</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(estimate.breakdown).map(([category, data]) => (
        <div key={category}>
          <h3 className="font-semibold text-lg mb-3 capitalize">{category}</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Materiaal</TableHead>
                <TableHead className="text-right">Hoeveelheid</TableHead>
                <TableHead className="text-right">Eenheidsprijs</TableHead>
                <TableHead className="text-right">Totaal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.name}</div>
                      {item.sku && (
                        <div className="text-sm text-muted-foreground">SKU: {item.sku}</div>
                      )}
                      {item.supplier && (
                        <div className="text-sm text-muted-foreground">{item.supplier}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {item.quantity} {item.unit}
                  </TableCell>
                  <TableCell className="text-right">
                    €{item.unitCost.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    €{item.totalCost.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50">
                <TableCell colSpan={3} className="font-medium">
                  Subtotaal {category}
                </TableCell>
                <TableCell className="text-right font-bold">
                  €{data.subtotal.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}