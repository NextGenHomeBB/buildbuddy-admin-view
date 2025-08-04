import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MaterialSearchRequest {
  query: string;
  limit?: number;
}

interface Material {
  sku: string;
  name: string;
  description: string;
  unit: string;
  price: number;
  supplier: string;
  availability: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 10 }: MaterialSearchRequest = await req.json();
    
    if (!query || query.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Query must be at least 2 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching materials for: ${query}`);
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // First, search local materials database
    const { data: localMaterials, error: localError } = await supabase
      .from('materials')
      .select('*')
      .or(`sku.ilike.%${query}%,name.ilike.%${query}%`)
      .limit(limit);

    if (localError) {
      console.error('Local search error:', localError);
    }

    const results: Material[] = [];

    // Add local materials to results
    if (localMaterials) {
      localMaterials.forEach(material => {
        results.push({
          sku: material.sku || '',
          name: material.name || '',
          description: material.category || '',
          unit: material.unit || 'pcs',
          price: material.unit_cost || 0,
          supplier: material.supplier || 'Local',
          availability: true
        });
      });
    }

    // TODO: Add external API integrations for Stiho and Hornbach
    // For now, we'll simulate external data
    if (results.length < limit) {
      const mockResults = await simulateExternalAPIs(query, limit - results.length);
      results.push(...mockResults);
    }

    return new Response(
      JSON.stringify({ materials: results }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Material lookup error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

// Simulate external API calls (replace with real integrations)
async function simulateExternalAPIs(query: string, limit: number): Promise<Material[]> {
  const mockMaterials: Material[] = [
    {
      sku: `STH-${query.toUpperCase()}-001`,
      name: `${query} Premium Grade`,
      description: 'High quality construction material',
      unit: 'pcs',
      price: 25.99,
      supplier: 'Stiho',
      availability: true
    },
    {
      sku: `HB-${query.toUpperCase()}-002`,
      name: `${query} Standard`,
      description: 'Standard grade construction material',
      unit: 'pcs', 
      price: 19.99,
      supplier: 'Hornbach',
      availability: true
    }
  ];

  return mockMaterials.slice(0, limit);
}

serve(handler);