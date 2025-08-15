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

    console.log(`[ASSIGN] Starting assignment of ${workerIds.length} workers to project ${projectId} by admin ${adminId}`);

    // Validate input
    if (!projectId || !workerIds || !Array.isArray(workerIds) || workerIds.length === 0) {
      console.error('[ASSIGN] Invalid input parameters');
      return new Response(
        JSON.stringify({ error: 'Invalid parameters', details: 'projectId and workerIds are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client with service role key for elevated permissions
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[ASSIGN] Supabase client created with service role');

    // Use the secure database function to assign workers
    // This bypasses RLS policies and prevents recursion issues
    const { data, error } = await supabase.rpc('assign_workers_to_project', {
      p_project_id: projectId,
      p_worker_ids: workerIds,
      p_admin_id: adminId
    });

    if (error) {
      console.error('[ASSIGN] Database function error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to assign workers', details: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[ASSIGN] Successfully assigned ${data?.length || 0} workers to project ${projectId}`);

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