import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
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
    const { data: { user } } = await supabaseClient.auth.getUser(token)

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Check if user is admin
    const { data: currentUserRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (currentUserRole?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Fetch system statistics
    const stats = {
      total_users: 0,
      active_users: 0,
      total_projects: 0,
      active_projects: 0,
      total_tasks: 0,
      completed_tasks: 0,
      pending_invitations: 0
    }

    // Get user counts
    const { count: totalUsers } = await supabaseClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    stats.total_users = totalUsers || 0

    // Get active users (users with recent activity)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { count: activeUsers } = await supabaseClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString())

    stats.active_users = activeUsers || 0

    // Get project counts
    const { count: totalProjects } = await supabaseClient
      .from('projects')
      .select('*', { count: 'exact', head: true })

    stats.total_projects = totalProjects || 0

    const { count: activeProjects } = await supabaseClient
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    stats.active_projects = activeProjects || 0

    // Get task counts
    const { count: totalTasks } = await supabaseClient
      .from('tasks')
      .select('*', { count: 'exact', head: true })

    stats.total_tasks = totalTasks || 0

    const { count: completedTasks } = await supabaseClient
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'done')

    stats.completed_tasks = completedTasks || 0

    // Get pending invitations count
    const { count: pendingInvitations } = await supabaseClient
      .from('user_invitations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    stats.pending_invitations = pendingInvitations || 0

    return new Response(
      JSON.stringify(stats),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in get-system-stats function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})