import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette } from 'lucide-react';

export default function AdminStylingSimple() {
  console.log('AdminStylingSimple: Component rendering');
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Styling (Simple)</h1>
        <p className="text-muted-foreground">
          Simplified version for debugging
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Simple Styling Interface
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This is a simplified version of the AI Styling interface. 
            If you can see this, the routing is working correctly.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}