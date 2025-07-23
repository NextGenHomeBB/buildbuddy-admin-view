import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { projectId } = await req.json()

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'Project ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Updating phase progress for project: ${projectId}`)

    // Get all phases for the project
    const { data: phases, error: phasesError } = await supabaseClient
      .from('project_phases')
      .select('id')
      .eq('project_id', projectId)

    if (phasesError) {
      console.error('Error fetching phases:', phasesError)
      throw phasesError
    }

    // Update progress for each phase
    for (const phase of phases || []) {
      // Get tasks for this phase
      const { data: tasks, error: tasksError } = await supabaseClient
        .from('tasks')
        .select('status')
        .eq('phase_id', phase.id)

      if (tasksError) {
        console.error(`Error fetching tasks for phase ${phase.id}:`, tasksError)
        continue
      }

      // Calculate progress
      const totalTasks = tasks?.length || 0
      const completedTasks = tasks?.filter(task => task.status === 'done').length || 0
      const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

      // Update phase progress
      const { error: updateError } = await supabaseClient
        .from('project_phases')
        .update({ progress })
        .eq('id', phase.id)

      if (updateError) {
        console.error(`Error updating progress for phase ${phase.id}:`, updateError)
      } else {
        console.log(`Updated phase ${phase.id} progress to ${progress}%`)
      }
    }

    // Calculate and update project progress
    const { data: updatedPhases, error: updatedPhasesError } = await supabaseClient
      .from('project_phases')
      .select('progress')
      .eq('project_id', projectId)

    if (updatedPhasesError) {
      console.error('Error fetching updated phases:', updatedPhasesError)
      throw updatedPhasesError
    }

    const totalPhases = updatedPhases?.length || 0
    const averageProgress = totalPhases > 0 
      ? updatedPhases.reduce((sum, phase) => sum + (phase.progress || 0), 0) / totalPhases 
      : 0

    // Update project progress
    const { error: projectUpdateError } = await supabaseClient
      .from('projects')
      .update({ progress: averageProgress })
      .eq('id', projectId)

    if (projectUpdateError) {
      console.error('Error updating project progress:', projectUpdateError)
      throw projectUpdateError
    }

    console.log(`Updated project ${projectId} progress to ${averageProgress}%`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Phase and project progress updated successfully',
        projectProgress: averageProgress 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in updatePhaseProgress function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})