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

    // Get project organization and check permissions
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('org_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Project not found:', projectError);
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Project org_id:', project.org_id);

    // Check user permissions using the new comprehensive function
    const { data: userRole, error: roleError } = await supabase
      .rpc('get_user_effective_role', { 
        p_user_id: adminId, 
        p_org_id: project.org_id 
      });

    console.log('User effective role:', userRole);

    if (roleError) {
      console.error('Error checking user role:', roleError);
      return new Response(
        JSON.stringify({ error: 'Error checking permissions' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if user has permission to assign workers
    if (!['admin', 'owner'].includes(userRole)) {
      console.log(`Permission denied: user ${adminId} has role ${userRole} but needs admin or owner`);
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient permissions to assign workers. Admin or organization owner role required.',
          userRole: userRole
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify all target users exist and are members of the organization
    const { data: targetUsers, error: usersError } = await supabase
      .from('organization_members')
      .select(`
        user_id,
        profiles:user_id (
          id,
          full_name
        )
      `)
      .eq('org_id', project.org_id)
      .in('user_id', workerIds)
      .eq('status', 'active');

    if (usersError) {
      console.error('Error checking target users:', usersError);
      return new Response(
        JSON.stringify({ error: 'Error validating users' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (targetUsers.length !== workerIds.length) {
      console.log(`Some users not found or not members: requested ${workerIds.length}, found ${targetUsers.length}`);
      return new Response(
        JSON.stringify({ error: 'Some users are not members of the project organization' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

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
        data,
        message: `Successfully assigned ${data?.length || 0} worker(s) to the project`
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