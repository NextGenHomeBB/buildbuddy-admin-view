import React from 'react';

interface PalettePreviewProps {
  palette?: {
    primary: string;
    secondary: string;
    accent: string;
    neutral: string[];
  };
}

export function PalettePreview({ palette }: PalettePreviewProps) {
  if (!palette) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p>Geen kleurenpalet beschikbaar</p>
        <p className="text-sm mt-1">Gebruik de AI prompt om een stijl te genereren</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Primair</h4>
          <div 
            className="h-16 rounded-lg border"
            style={{ backgroundColor: palette.primary }}
          />
          <p className="text-xs text-muted-foreground">{palette.primary}</p>
        </div>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Secundair</h4>
          <div 
            className="h-16 rounded-lg border"
            style={{ backgroundColor: palette.secondary }}
          />
          <p className="text-xs text-muted-foreground">{palette.secondary}</p>
        </div>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Accent</h4>
          <div 
            className="h-16 rounded-lg border"
            style={{ backgroundColor: palette.accent }}
          />
          <p className="text-xs text-muted-foreground">{palette.accent}</p>
        </div>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Neutraal</h4>
          <div className="flex gap-1">
            {palette.neutral.map((color, index) => (
              <div
                key={index}
                className="flex-1 h-16 rounded border"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {palette.neutral.join(', ')}
          </p>
        </div>
      </div>
    </div>
  );
}