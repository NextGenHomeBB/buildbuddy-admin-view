import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { project_id } = await req.json();

    if (!project_id) {
      return new Response(
        JSON.stringify({ error: 'project_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Duplicating project:', project_id);

    // Get the original project
    const { data: originalProject, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .single();

    if (projectError || !originalProject) {
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new project (copy of original)
    const { data: newProject, error: createError } = await supabase
      .from('projects')
      .insert([{
        name: `${originalProject.name} (Copy)`,
        description: originalProject.description,
        status: 'planning', // Reset status to planning
        budget: originalProject.budget,
        location: originalProject.location,
        manager_id: originalProject.manager_id,
        company_id: originalProject.company_id,
        progress: 0, // Reset progress
      }])
      .select()
      .single();

    if (createError || !newProject) {
      return new Response(
        JSON.stringify({ error: 'Failed to create project copy' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('New project created:', newProject.id);

    // Get original phases
    const { data: originalPhases } = await supabase
      .from('project_phases')
      .select('*')
      .eq('project_id', project_id);

    // Duplicate phases if they exist
    if (originalPhases && originalPhases.length > 0) {
      const phasesToInsert = originalPhases.map(phase => ({
        project_id: newProject.id,
        name: phase.name,
        description: phase.description,
        status: 'not_started', // Reset status
        start_date: null, // Clear dates
        end_date: null,
        progress: 0, // Reset progress
      }));

      const { data: newPhases } = await supabase
        .from('project_phases')
        .insert(phasesToInsert)
        .select();

      console.log('Phases duplicated:', newPhases?.length || 0);

      // Get original tasks and duplicate them
      const { data: originalTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', project_id);

      if (originalTasks && originalTasks.length > 0 && newPhases) {
        // Create mapping between old and new phase IDs
        const phaseMapping = new Map();
        for (let i = 0; i < originalPhases.length; i++) {
          if (newPhases[i]) {
            phaseMapping.set(originalPhases[i].id, newPhases[i].id);
          }
        }

        const tasksToInsert = originalTasks.map(task => ({
          project_id: newProject.id,
          phase_id: task.phase_id ? phaseMapping.get(task.phase_id) : null,
          title: task.title,
          description: task.description,
          status: 'todo', // Reset status
          priority: task.priority,
        }));

        const { data: newTasks } = await supabase
          .from('tasks')
          .insert(tasksToInsert)
          .select();

        console.log('Tasks duplicated:', newTasks?.length || 0);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        new_project_id: newProject.id,
        message: 'Project duplicated successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in duplicate_project function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});