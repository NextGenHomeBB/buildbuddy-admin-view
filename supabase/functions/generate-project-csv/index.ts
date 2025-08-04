import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  project_id: string
  start_date?: string
  end_date?: string
  export_type: 'summary' | 'detailed'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check rate limiting
    const { data: rateLimitCheck } = await supabase.rpc('check_rate_limit', {
      operation_name: 'csv_export',
      max_attempts: 5,
      window_minutes: 15
    })

    if (!rateLimitCheck) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { project_id, start_date, end_date, export_type }: RequestBody = await req.json()

    if (!project_id) {
      return new Response(
        JSON.stringify({ error: 'project_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user has access to this project
    const { data: userRole } = await supabase
      .from('user_project_role')
      .select('role')
      .eq('user_id', user.id)
      .eq('project_id', project_id)
      .single()

    const { data: globalRole } = await supabase.rpc('get_current_user_role')

    if (!userRole && globalRole !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Access denied to this project' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let csvData: string
    let filename: string

    if (export_type === 'summary') {
      // Export summary data from project_costs_vw
      const { data: costData, error } = await supabase
        .from('project_costs_vw')
        .select('*')
        .eq('project_id', project_id)

      if (error) {
        console.error('Error fetching cost summary:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch cost data' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Convert to CSV
      if (costData && costData.length > 0) {
        const headers = Object.keys(costData[0]).join(',')
        const rows = costData.map(row => 
          Object.values(row).map(value => 
            typeof value === 'string' && value.includes(',') ? `"${value}"` : value
          ).join(',')
        ).join('\n')
        csvData = `${headers}\n${rows}`
      } else {
        csvData = 'No data available for the specified project'
      }

      filename = `project-${project_id}-cost-summary-${new Date().toISOString().split('T')[0]}.csv`
    } else {
      // Export detailed data with date filtering
      const dateFilter = start_date && end_date 
        ? { gte: start_date, lte: end_date }
        : {}

      // Fetch time logs
      let timeLogsQuery = supabase
        .from('time_sheets')
        .select(`
          work_date,
          hours,
          break_duration,
          shift_type,
          location,
          note,
          approval_status,
          profiles!inner(full_name)
        `)
        .eq('project_id', project_id)

      if (start_date && end_date) {
        timeLogsQuery = timeLogsQuery
          .gte('work_date', start_date)
          .lte('work_date', end_date)
      }

      const { data: timeLogs } = await timeLogsQuery

      // Fetch materials
      let materialsQuery = supabase
        .from('project_materials')
        .select(`
          quantity,
          total_cost,
          materials(name, unit, sku)
        `)
        .eq('project_id', project_id)

      const { data: materials } = await materialsQuery

      // Fetch expenses  
      let expensesQuery = supabase
        .from('worker_expenses')
        .select(`
          expense_date,
          amount,
          expense_type,
          description,
          status,
          profiles!inner(full_name)
        `)
        .eq('project_id', project_id)

      if (start_date && end_date) {
        expensesQuery = expensesQuery
          .gte('expense_date', start_date)
          .lte('expense_date', end_date)
      }

      const { data: expenses } = await expensesQuery

      // Combine all data into CSV format
      const allData: any[] = []

      // Add time logs
      timeLogs?.forEach(log => {
        allData.push({
          type: 'Labor',
          date: log.work_date,
          worker: log.profiles?.full_name || 'Unknown',
          description: `${log.hours}h ${log.shift_type} shift${log.note ? ` - ${log.note}` : ''}`,
          quantity: log.hours,
          unit: 'hours',
          amount: '', // Will be calculated based on rates
          status: log.approval_status
        })
      })

      // Add materials
      materials?.forEach(material => {
        allData.push({
          type: 'Material',
          date: '',
          worker: '',
          description: material.materials?.name || 'Unknown Material',
          quantity: material.quantity,
          unit: material.materials?.unit || 'pcs',
          amount: material.total_cost || 0,
          status: 'approved'
        })
      })

      // Add expenses
      expenses?.forEach(expense => {
        allData.push({
          type: 'Expense',
          date: expense.expense_date,
          worker: expense.profiles?.full_name || 'Unknown',
          description: `${expense.expense_type}: ${expense.description}`,
          quantity: 1,
          unit: 'item',
          amount: expense.amount,
          status: expense.status
        })
      })

      // Convert to CSV
      if (allData.length > 0) {
        const headers = Object.keys(allData[0]).join(',')
        const rows = allData.map(row => 
          Object.values(row).map(value => 
            typeof value === 'string' && value.includes(',') ? `"${value}"` : value
          ).join(',')
        ).join('\n')
        csvData = `${headers}\n${rows}`
      } else {
        csvData = 'No detailed data available for the specified criteria'
      }

      const dateRange = start_date && end_date ? `-${start_date}-to-${end_date}` : ''
      filename = `project-${project_id}-detailed-costs${dateRange}-${new Date().toISOString().split('T')[0]}.csv`
    }

    return new Response(csvData, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })

  } catch (error) {
    console.error('Error generating CSV:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})