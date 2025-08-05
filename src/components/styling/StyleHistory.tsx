import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePlanStore } from '@/store/planStore';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Palette } from 'lucide-react';

export function StyleHistory() {
  const { activePlanId, activeStyleId, setActiveStyleId } = usePlanStore();

  const { data: styles, isLoading } = useQuery({
    queryKey: ['plan-styles', activePlanId],
    queryFn: async () => {
      if (!activePlanId) return [];
      
      const { data, error } = await supabase
        .from('plan_styles')
        .select('*')
        .eq('plan_id', activePlanId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!activePlanId,
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Laden...</div>;
  }

  if (!styles?.length) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Nog geen stijlen gegenereerd voor deze plattegrond
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {styles.map((style) => (
        <Button
          key={style.id}
          variant={activeStyleId === style.id ? "default" : "ghost"}
          className="w-full justify-start text-left h-auto py-2 px-3"
          onClick={() => setActiveStyleId(style.id)}
        >
          <div className="flex items-start gap-2 w-full">
            <Palette className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm truncate">{style.name}</div>
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(style.created_at), {
                  addSuffix: true,
                  locale: nl
                })}
              </div>
              <div className="text-xs text-muted-foreground capitalize">
                {style.theme}
              </div>
            </div>
          </div>
        </Button>
      ))}
    </div>
  );
}