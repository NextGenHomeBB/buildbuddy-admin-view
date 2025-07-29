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

    // Generate CSV report
    const reportDate = new Date().toISOString().split('T')[0]
    
    // Fetch data for report
    const { data: users } = await supabaseClient
      .from('profiles')
      .select('id, full_name, created_at')

    const { data: projects } = await supabaseClient
      .from('projects')
      .select('id, name, status, created_at, progress')

    const { data: tasks } = await supabaseClient
      .from('tasks')
      .select('id, title, status, priority, created_at, completed_at')

    const { data: auditLogs } = await supabaseClient
      .from('security_audit_log')
      .select('action, table_name, timestamp')
      .order('timestamp', { ascending: false })
      .limit(100)

    // Create CSV content
    let csvContent = `System Report - Generated on ${reportDate}\n\n`

    // Users section
    csvContent += `USERS SUMMARY\n`
    csvContent += `Total Users,${users?.length || 0}\n`
    csvContent += `New Users (Last 30 Days),${users?.filter(u => {
      const created = new Date(u.created_at)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return created >= thirtyDaysAgo
    }).length || 0}\n\n`

    // Projects section
    csvContent += `PROJECTS SUMMARY\n`
    csvContent += `Total Projects,${projects?.length || 0}\n`
    csvContent += `Active Projects,${projects?.filter(p => p.status === 'active').length || 0}\n`
    csvContent += `Completed Projects,${projects?.filter(p => p.status === 'completed').length || 0}\n`
    csvContent += `Average Progress,${projects?.length ? 
      (projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length).toFixed(1) : 0}%\n\n`

    // Tasks section
    csvContent += `TASKS SUMMARY\n`
    csvContent += `Total Tasks,${tasks?.length || 0}\n`
    csvContent += `Completed Tasks,${tasks?.filter(t => t.status === 'done').length || 0}\n`
    csvContent += `High Priority Tasks,${tasks?.filter(t => t.priority === 'high').length || 0}\n\n`

    // Recent activity section
    csvContent += `RECENT SECURITY ACTIVITY (Last 100 events)\n`
    csvContent += `Action,Table,Timestamp\n`
    auditLogs?.forEach(log => {
      csvContent += `${log.action},${log.table_name},${log.timestamp}\n`
    })

    return new Response(
      JSON.stringify({ 
        report: csvContent,
        generated_at: new Date().toISOString(),
        admin_id: user.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in export-system-report function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})