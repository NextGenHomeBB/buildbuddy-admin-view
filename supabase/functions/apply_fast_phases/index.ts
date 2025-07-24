import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ApplyFastPhasesRequest {
  project_id: string;
  template_ids: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    // Set the auth token and verify admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Set the auth context for the supabase client
    supabase.auth.setSession({
      access_token: token,
      refresh_token: ''
    })

    // Verify admin role using the user_roles table directly
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    if (roleError) {
      console.error('Error checking user roles:', roleError)
      return new Response(
        JSON.stringify({ error: 'Error verifying admin access' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const hasAdminRole = userRoles?.some(role => role.role === 'admin')
    
    if (!hasAdminRole) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { project_id, template_ids }: ApplyFastPhasesRequest = await req.json()

    console.log('Applying fast phases:', { project_id, template_ids })

    if (!project_id || !template_ids || template_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing project_id or template_ids' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let totalPhases = 0;
    let totalTasks = 0;

    // Process each template
    for (const templateId of template_ids) {
      // Get the phase template
      const { data: phaseTemplate, error: phaseError } = await supabase
        .from('phase_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (phaseError) {
        console.error('Error fetching phase template:', phaseError)
        continue
      }

      // Create the project phase
      const { data: newPhase, error: phaseInsertError } = await supabase
        .from('project_phases')
        .insert({
          project_id,
          name: phaseTemplate.name,
          description: phaseTemplate.description,
          status: 'not_started'
        })
        .select()
        .single()

      if (phaseInsertError) {
        console.error('Error creating phase:', phaseInsertError)
        continue
      }

      totalPhases++

      // Get checklist templates for this phase
      const { data: checklistTemplates, error: checklistError } = await supabase
        .from('checklist_templates')
        .select('*')
        .eq('phase_template_id', templateId)
        .order('sort_order')

      if (checklistError) {
        console.error('Error fetching checklist templates:', checklistError)
        continue
      }

      // Create tasks for each checklist item
      if (checklistTemplates && checklistTemplates.length > 0) {
        const tasksToInsert = checklistTemplates.map(template => ({
          phase_id: newPhase.id,
          project_id,
          title: template.label,
          status: 'todo',
          priority: 'medium'
        }))

        const { error: tasksInsertError } = await supabase
          .from('tasks')
          .insert(tasksToInsert)

        if (tasksInsertError) {
          console.error('Error creating tasks:', tasksInsertError)
        } else {
          totalTasks += tasksToInsert.length
        }
      }
    }

    console.log('Fast phases applied successfully:', { totalPhases, totalTasks })

    return new Response(
      JSON.stringify({ 
        success: true,
        phases: totalPhases, 
        tasks: totalTasks 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in apply_fast_phases:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})