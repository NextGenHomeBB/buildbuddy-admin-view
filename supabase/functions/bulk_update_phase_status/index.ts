import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UpdatePhaseStatusRequest {
  project_id: string;
  phase_ids: string[];
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.log('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Set the auth context
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.log('Invalid token or user not found:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('User authenticated:', user.id);

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      console.log('User is not admin. Profile:', profile, 'Error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Admin role verified for user:', user.id);

    // Parse request body
    const requestData: UpdatePhaseStatusRequest = await req.json();
    const { project_id, phase_ids, status } = requestData;

    // Validate input
    if (!project_id || !Array.isArray(phase_ids) || phase_ids.length === 0 || !status) {
      console.log('Invalid request data:', requestData);
      return new Response(
        JSON.stringify({ error: 'Invalid request data. Required: project_id, phase_ids (array), status' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate status value
    const validStatuses = ['not_started', 'in_progress', 'completed', 'blocked'];
    if (!validStatuses.includes(status)) {
      console.log('Invalid status value:', status);
      return new Response(
        JSON.stringify({ error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Updating phases:', { project_id, phase_ids, status });

    // Update phases using Supabase client
    const { data: updatedPhases, error: updateError } = await supabaseClient
      .from('project_phases')
      .update({ status })
      .eq('project_id', project_id)
      .in('id', phase_ids)
      .select('id');

    if (updateError) {
      console.error('Error updating phases:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update phases', details: updateError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const updatedCount = updatedPhases?.length || 0;
    console.log('Successfully updated phases. Count:', updatedCount);

    return new Response(
      JSON.stringify({ 
        updated_count: updatedCount,
        message: `Successfully updated ${updatedCount} phase${updatedCount !== 1 ? 's' : ''}`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in bulk_update_phase_status:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});