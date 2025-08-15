import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lightbulb, Palette, Calculator, Sparkles } from 'lucide-react';
import { usePlanStore } from '@/store/planStore';
import { ErrorBoundaryWrapper } from '@/components/ErrorBoundaryWrapper';

// Import AI components
import { CanvasArea } from '@/components/indeling/CanvasArea';
import { RoomPalette } from '@/components/indeling/RoomPalette';
import { PlanHistory } from '@/components/indeling/PlanHistory';
import { PalettePreview } from '@/components/styling/PalettePreview';
import { MoodBoard } from '@/components/styling/MoodBoard';
import { StyleHistory } from '@/components/styling/StyleHistory';
import { MaterialsEstimate } from '@/components/ai-materials/MaterialsEstimate';
import { CostSummary } from '@/components/ai-materials/CostSummary';
import { ExportOptions } from '@/components/ai-materials/ExportOptions';
import { PromptBar } from '@/components/ui/prompt-bar';

// Import hooks
import { useGenerateLayout } from '@/hooks/useGenerateLayout';
import { useGenerateStyle } from '@/hooks/useGenerateStyle';
import { useComputeMaterials } from '@/hooks/useComputeMaterials';

interface ProjectAIHubProps {
  projectId: string;
  projectName: string;
}

export function ProjectAIHub({ projectId, projectName }: ProjectAIHubProps) {
  console.log('ProjectAIHub: Component rendering', { projectId, projectName });
  
  const navigate = useNavigate();
  const location = useLocation();
  const { activePlanId, activeStyleId, setActiveProjectId } = usePlanStore();

  console.log('ProjectAIHub: Store state', { activePlanId, activeStyleId });

  // Set the active project when the component mounts
  useEffect(() => {
    console.log('ProjectAIHub: Setting active project', projectId);
    setActiveProjectId(projectId);
  }, [projectId, setActiveProjectId]);
  
  const { mutate: generateLayout, isPending: isGeneratingLayout } = useGenerateLayout();
  const { mutate: generateStyle, isPending: isGeneratingStyle, data: styleData } = useGenerateStyle();
  const { mutate: computeMaterials, isPending: isComputingMaterials, data: estimateData } = useComputeMaterials();

  console.log('ProjectAIHub: Hooks loaded', { 
    isGeneratingLayout, 
    isGeneratingStyle, 
    isComputingMaterials,
    hasStyleData: !!styleData,
    hasEstimateData: !!estimateData
  });

  // Get current AI tool from URL
  const pathParts = location.pathname.split('/');
  const currentTool = pathParts[pathParts.length - 1];
  const activeTab = ['indeling', 'styling', 'materials'].includes(currentTool) ? currentTool : 'indeling';

  console.log('ProjectAIHub: Navigation state', { 
    pathname: location.pathname, 
    pathParts, 
    currentTool, 
    activeTab 
  });

  // Navigate to indeling by default when on /ai route
  useEffect(() => {
    if (currentTool === 'ai') {
      navigate(`/admin/projects/${projectId}/ai/indeling`, { replace: true });
    }
  }, [currentTool, navigate, projectId]);

  const handleTabChange = (value: string) => {
    navigate(`/admin/projects/${projectId}/ai/${value}`);
  };

  const handleGenerateLayout = (prompt: string) => {
    generateLayout({ 
      prompt: `Generate floor plan for ${projectName}: ${prompt}` 
    });
  };

  const handleGenerateStyle = (prompt: string) => {
    if (!activePlanId) {
      return;
    }
    generateStyle({ 
      prompt: `Style for ${projectName}: ${prompt}` 
    });
  };

  const handleComputeMaterials = () => {
    if (!activePlanId) {
      return;
    }
    computeMaterials();
  };

  console.log('ProjectAIHub: About to render', { activeTab, activePlanId });

  return (
    <ErrorBoundaryWrapper componentName="ProjectAIHub">
      <div className="space-y-6">
        {/* AI Tools Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">AI Tools</h1>
          </div>
          <span className="text-muted-foreground">voor {projectName}</span>
        </div>

      {/* AI Tools Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="indeling" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            Indeling
          </TabsTrigger>
          <TabsTrigger value="styling" className="gap-2">
            <Palette className="h-4 w-4" />
            Styling
          </TabsTrigger>
          <TabsTrigger value="materials" className="gap-2">
            <Calculator className="h-4 w-4" />
            AI Materials
          </TabsTrigger>
        </TabsList>

        {/* AI Indeling Tab */}
        <TabsContent value="indeling" className="space-y-6">
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Main canvas area */}
            <div className="lg:col-span-3 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Plattegrond Canvas</CardTitle>
                </CardHeader>
                <CardContent>
                  <CanvasArea />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>AI Plattegrond Generator</CardTitle>
                </CardHeader>
                <CardContent>
                  <PromptBar
                    onSubmit={handleGenerateLayout}
                    loading={isGeneratingLayout}
                    placeholder="Bijv. 3 slaapkamers, 2 badkamers, open keuken, woonkamer 150m²"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Kamers</CardTitle>
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
        </TabsContent>

        {/* AI Styling Tab */}
        <TabsContent value="styling" className="space-y-6">
          <ErrorBoundaryWrapper componentName="AI Styling Tab">
            {!activePlanId ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <Palette className="h-12 w-12 text-muted-foreground mx-auto" />
                    <div>
                      <h3 className="text-lg font-semibold">Geen plattegrond geselecteerd</h3>
                      <p className="text-muted-foreground">
                        Genereer eerst een plattegrond in de Indeling tab om te beginnen met styling.
                      </p>
                    </div>
                    <Button onClick={() => handleTabChange('indeling')}>
                      Ga naar Indeling
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Main content */}
                <div className="lg:col-span-2 space-y-4">
                  <ErrorBoundaryWrapper componentName="Palette Preview">
                    <Card>
                      <CardHeader>
                        <CardTitle>Kleurpalet</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <PalettePreview palette={styleData?.palette} />
                      </CardContent>
                    </Card>
                  </ErrorBoundaryWrapper>

                  <ErrorBoundaryWrapper componentName="Mood Board">
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
                  </ErrorBoundaryWrapper>

                  <ErrorBoundaryWrapper componentName="Styling Generator">
                    <Card>
                      <CardHeader>
                        <CardTitle>AI Styling Generator</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <PromptBar
                          onSubmit={handleGenerateStyle}
                          loading={isGeneratingStyle}
                          placeholder="Bijv. Scandinavisch, lichte houttinten, witte muren, natuurlijke materialen"
                        />
                      </CardContent>
                    </Card>
                  </ErrorBoundaryWrapper>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  <ErrorBoundaryWrapper componentName="Style History">
                    <Card>
                      <CardHeader>
                        <CardTitle>Stijl Geschiedenis</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <StyleHistory />
                      </CardContent>
                    </Card>
                  </ErrorBoundaryWrapper>
                </div>
              </div>
            )}
          </ErrorBoundaryWrapper>
        </TabsContent>

        {/* AI Materials Tab */}
        <TabsContent value="materials" className="space-y-6">
          {!activePlanId ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <Calculator className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold">Geen plattegrond geselecteerd</h3>
                    <p className="text-muted-foreground">
                      Genereer eerst een plattegrond in de Indeling tab om materialen te berekenen.
                    </p>
                  </div>
                  <Button onClick={() => handleTabChange('indeling')}>
                    Ga naar Indeling
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>AI Materialen Calculator</CardTitle>
                      <p className="text-muted-foreground mt-1">
                        Bereken automatisch benodigde materialen voor je plattegrond
                      </p>
                    </div>
                    <Button 
                      onClick={handleComputeMaterials}
                      disabled={isComputingMaterials}
                      className="gap-2"
                    >
                      <Calculator className="h-4 w-4" />
                      {isComputingMaterials ? 'Berekenen...' : 'Bereken Materialen'}
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              <div className="grid lg:grid-cols-3 gap-6">
                {/* Materials list */}
                <div className="lg:col-span-2">
                  <MaterialsEstimate 
                    estimate={estimateData} 
                    loading={isComputingMaterials} 
                  />
                </div>

                {/* Summary and export */}
                <div className="space-y-4">
                  <CostSummary estimate={estimateData} />
                  <ExportOptions estimate={estimateData} />
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </ErrorBoundaryWrapper>
  );
}