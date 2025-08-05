import React from 'react';
import { CanvasArea } from '@/components/indeling/CanvasArea';
import { RoomPalette } from '@/components/indeling/RoomPalette';
import { PlanHistory } from '@/components/indeling/PlanHistory';
import { PromptBar } from '@/components/ui/prompt-bar';
import { useGenerateLayout } from '@/hooks/useGenerateLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminIndeling() {
  const { mutate: generateLayout, isPending: isGenerating } = useGenerateLayout();

  const handleGenerateLayout = (prompt: string) => {
    generateLayout({ prompt });
  };

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Indeling</h1>
          <p className="text-muted-foreground">
            Genereer en bewerk plattegronden met AI
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Main canvas area */}
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Plattegrond Editor</CardTitle>
              </CardHeader>
              <CardContent>
                <CanvasArea />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Prompt</CardTitle>
              </CardHeader>
              <CardContent>
                <PromptBar
                  onSubmit={handleGenerateLayout}
                  loading={isGenerating}
                  placeholder="Bijv. 3-slaapkamer woning, 120 m², L-vormige indeling met open keuken"
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Kamer Palette</CardTitle>
              </CardHeader>
              <CardContent>
                <RoomPalette />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Geschiedenis</CardTitle>
              </CardHeader>
              <CardContent>
                <PlanHistory />
              </CardContent>
            </Card>
          </div>
        </div>
    </div>
  );
}