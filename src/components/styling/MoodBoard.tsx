import React from 'react';

interface MoodBoardProps {
  images?: string[];
  textures?: Array<{
    name: string;
    description: string;
    url?: string;
  }>;
}

export function MoodBoard({ images, textures }: MoodBoardProps) {
  if (!images?.length && !textures?.length) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p>Geen mood board beschikbaar</p>
        <p className="text-sm mt-1">Gebruik de AI prompt om inspiratie te genereren</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {images?.length && (
        <div>
          <h4 className="text-sm font-medium mb-3">Inspiratie Afbeeldingen</h4>
          <div className="grid grid-cols-2 gap-3">
            {images.map((image, index) => (
              <div key={index} className="aspect-square rounded-lg overflow-hidden bg-muted">
                <img 
                  src={image} 
                  alt={`Mood board ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {textures?.length && (
        <div>
          <h4 className="text-sm font-medium mb-3">Texturen</h4>
          <div className="space-y-3">
            {textures.map((texture, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                {texture.url && (
                  <div className="w-12 h-12 rounded bg-muted overflow-hidden">
                    <img 
                      src={texture.url} 
                      alt={texture.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h5 className="font-medium text-sm">{texture.name}</h5>
                  <p className="text-xs text-muted-foreground">{texture.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}