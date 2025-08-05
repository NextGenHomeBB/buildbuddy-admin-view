import React from 'react';
import { PalettePreview } from '@/components/styling/PalettePreview';
import { MoodBoard } from '@/components/styling/MoodBoard';
import { StyleHistory } from '@/components/styling/StyleHistory';
import { PromptBar } from '@/components/ui/prompt-bar';
import { useGenerateStyle } from '@/hooks/useGenerateStyle';
import { usePlanStore } from '@/store/planStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function AdminStyling() {
  const { mutate: generateStyle, isPending: isGenerating, data: styleData } = useGenerateStyle();
  const { activePlanId } = usePlanStore();

  const handleGenerateStyle = (prompt: string) => {
    if (!activePlanId) {
      return;
    }
    generateStyle({ prompt });
  };

  if (!activePlanId) {
    return (
      <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Styling</h1>
            <p className="text-muted-foreground">
              Genereer kleurpaletten en stijlen voor je plattegrond
            </p>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Selecteer eerst een plattegrond in de AI Indeling tool om te beginnen met styling.
            </AlertDescription>
          </Alert>
        </div>
    );
  }

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Styling</h1>
          <p className="text-muted-foreground">
            Genereer kleurpaletten en stijlen voor je plattegrond
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Kleurpalet</CardTitle>
              </CardHeader>
              <CardContent>
                <PalettePreview palette={styleData?.palette} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mood Board</CardTitle>
              </CardHeader>
              <CardContent>
                <MoodBoard 
                  images={styleData?.moodImages} 
                  textures={styleData?.textures}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Styling Prompt</CardTitle>
              </CardHeader>
              <CardContent>
                <PromptBar
                  onSubmit={handleGenerateStyle}
                  loading={isGenerating}
                  placeholder="Bijv. Scandinavisch, lichte houttinten, witte muren, natuurlijke materialen"
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Stijl Geschiedenis</CardTitle>
              </CardHeader>
              <CardContent>
                <StyleHistory />
              </CardContent>
            </Card>
          </div>
        </div>
    </div>
  );
}