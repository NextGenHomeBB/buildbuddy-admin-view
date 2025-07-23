
// This function updates the project data to match the screenshots
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const projectId = '56b4fc08-50c1-4507-88cb-0f170d2aecbd';

    // Update project
    await supabaseClient
      .from('projects')
      .update({
        name: 'Maria Austriastraat 1019',
        description: 'Residential renovation project in Amsterdam IJburg',
        location: 'Amsterdam IJburg',
        start_date: '2025-07-18',
        budget: 50000,
        progress: 75,
        status: 'active'
      })
      .eq('id', projectId);

    // Delete existing phases
    await supabaseClient
      .from('project_phases')
      .delete()
      .eq('project_id', projectId);

    // Insert new phases
    const phases = [
      { name: 'Bouwtekening', description: 'Architectural drawings and permits', status: 'completed', start_date: '2025-07-18', end_date: '2025-07-20', progress: 100 },
      { name: 'Sloop/Strip', description: 'Demolition and stripping work', status: 'completed', start_date: '2025-07-21', end_date: '2025-07-23', progress: 100 },
      { name: 'Styling & Opmeten', description: 'Styling consultation and measurements', status: 'in_progress', start_date: '2025-07-24', end_date: '2025-07-26', progress: 60 },
      { name: 'Installatie', description: 'Installation work', status: 'not_started', start_date: '2025-07-27', end_date: '2025-07-29', progress: 0 },
      { name: 'Afwerking', description: 'Finishing work', status: 'not_started', start_date: '2025-07-30', end_date: '2025-07-31', progress: 0 }
    ];

    const { data: insertedPhases } = await supabaseClient
      .from('project_phases')
      .insert(phases.map(phase => ({ ...phase, project_id: projectId })))
      .select();

    return new Response(
      JSON.stringify({ success: true, phases: insertedPhases }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
