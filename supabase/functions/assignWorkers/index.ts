import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AssignWorkersRequest {
  projectId: string;
  workerIds: string[];
  adminId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, workerIds, adminId }: AssignWorkersRequest = await req.json();

    // Create Supabase client with service role key for elevated permissions
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Assigning ${workerIds.length} workers to project ${projectId} by admin ${adminId}`);

    // Prepare assignment data
    const assignments = workerIds.map(workerId => ({
      user_id: workerId,
      project_id: projectId,
      role: 'worker',
      assigned_by: adminId,
      assigned_at: new Date().toISOString()
    }));

    // Perform bulk upsert with conflict resolution
    const { data, error } = await supabase
      .from('user_project_role')
      .upsert(assignments, {
        onConflict: 'user_id,project_id',
        ignoreDuplicates: false
      })
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `);

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to assign workers', details: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Successfully assigned ${data?.length || 0} workers`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        assigned: data?.length || 0,
        data 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in assignWorkers function:', error);
    return new Response(
      JSON.stringify({ error: 'Invalid request', details: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});