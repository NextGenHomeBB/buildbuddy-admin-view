import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Task {
  id: string
  title: string
  start_date: string
  duration_days: number
  required_roles: string[]
  crew_min: number
  crew_max: number | null
  project_id: string
}

interface Worker {
  id: string
  full_name: string
  work_role: string[]
  is_available: boolean
}

interface WorkerAvailability {
  worker_id: string
  day_of_week: number
  is_available: boolean
  start_time: string
  end_time: string
  max_hours: number
}

interface ShiftProposal {
  task_id: string
  worker_id: string
  project_id: string
  start_time: string
  end_time: string
  confidence_score: number
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { date, auto_confirm = false } = await req.json()
    const targetDate = new Date(date || new Date(Date.now() + 24 * 60 * 60 * 1000))
    const dayOfWeek = targetDate.getDay()

    console.log(`Starting optimization for date: ${targetDate.toISOString()}`)

    // Get tasks that should start on target date or are scheduled for that date
    const targetDateStr = targetDate.toISOString().split('T')[0]
    const { data: tasks, error: tasksError } = await supabaseClient
      .from('tasks')
      .select('id, title, start_date, end_date, duration_days, required_roles, crew_min, crew_max, project_id')
      .or(`start_date.eq.${targetDateStr},end_date.eq.${targetDateStr}`)
      .eq('status', 'todo')
      .eq('is_scheduled', true)

    console.log(`Found ${tasks?.length || 0} tasks for date ${targetDateStr}`)

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError)
      throw tasksError
    }

    // Get available workers with their roles
    const { data: workers, error: workersError } = await supabaseClient
      .from('profiles')
      .select('id, full_name, work_role')

    if (workersError) {
      console.error('Error fetching workers:', workersError)
      throw workersError
    }

    console.log(`Found ${workers?.length || 0} workers`)

    // Get worker availability for the target day
    const { data: availability, error: availabilityError } = await supabaseClient
      .from('worker_availability')
      .select('worker_id, day_of_week, is_available, start_time, end_time, max_hours')
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true)

    if (availabilityError) {
      console.error('Error fetching availability:', availabilityError)
      throw availabilityError
    }

    console.log(`Found ${availability?.length || 0} available workers for day ${dayOfWeek} (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]})`)

    // Get existing shifts for the target date to avoid conflicts
    const { data: existingShifts, error: shiftsError } = await supabaseClient
      .from('shifts')
      .select('worker_id, start_time, end_time')
      .gte('start_time', targetDate.toISOString().split('T')[0])
      .lt('start_time', new Date(targetDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .in('status', ['confirmed', 'proposed'])

    if (shiftsError) {
      console.error('Error fetching existing shifts:', shiftsError)
      throw shiftsError
    }

    const proposals: ShiftProposal[] = []
    const workerDailyHours: Record<string, number> = {}

    // Initialize worker daily hours
    workers?.forEach(worker => {
      workerDailyHours[worker.id] = 0
    })

    // Calculate hours from existing shifts
    existingShifts?.forEach(shift => {
      const duration = (new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime()) / (1000 * 60 * 60)
      workerDailyHours[shift.worker_id] = (workerDailyHours[shift.worker_id] || 0) + duration
    })

    // Optimization algorithm
    tasks?.forEach(task => {
      const taskRequiredRoles = task.required_roles || []
      const crewMin = task.crew_min || 1
      const crewMax = task.crew_max || 999
      
      // Find eligible workers
      const eligibleWorkers = workers?.filter(worker => {
        // Check if worker has required roles
        const workerRoles = worker.work_role || []
        const hasRequiredRoles = taskRequiredRoles.every(role => 
          workerRoles.some(workerRole => workerRole.toLowerCase().includes(role.toLowerCase()))
        )
        
        // Check availability for this day
        const workerAvailability = availability?.find(avail => avail.worker_id === worker.id)
        const isAvailable = workerAvailability?.is_available || false
        
        // Check daily hours limit
        const currentHours = workerDailyHours[worker.id] || 0
        const maxHours = workerAvailability?.max_hours || 8
        const hasHoursCapacity = currentHours < Math.min(maxHours, 10) // Max 10 hours per day
        
        return hasRequiredRoles && isAvailable && hasHoursCapacity
      }) || []

      console.log(`Task ${task.title}: Found ${eligibleWorkers.length} eligible workers`)

      // Sort workers by availability and current workload
      eligibleWorkers.sort((a, b) => {
        const aHours = workerDailyHours[a.id] || 0
        const bHours = workerDailyHours[b.id] || 0
        return aHours - bHours // Prefer workers with fewer hours
      })

      // Assign workers to task
      const assignedWorkers = eligibleWorkers.slice(0, Math.min(crewMax, eligibleWorkers.length))
      
      if (assignedWorkers.length >= crewMin) {
        assignedWorkers.forEach(worker => {
          const workerAvailability = availability?.find(avail => avail.worker_id === worker.id)
          const startTime = workerAvailability?.start_time || '08:00'
          const currentDate = targetDate.toISOString().split('T')[0]
          
          // Calculate shift duration (default 8 hours)
          const shiftDuration = 8
          const startDateTime = new Date(`${currentDate}T${startTime}:00`)
          const endDateTime = new Date(startDateTime.getTime() + shiftDuration * 60 * 60 * 1000)
          
          // Calculate confidence score based on role match and workload
          const roleMatchScore = taskRequiredRoles.length > 0 ? 
            taskRequiredRoles.filter(role => 
              (worker.work_role || []).some(workerRole => 
                workerRole.toLowerCase().includes(role.toLowerCase())
              )
            ).length / taskRequiredRoles.length : 1
          
          const workloadScore = 1 - ((workerDailyHours[worker.id] || 0) / 10) // Less loaded = higher score
          const confidenceScore = Math.round((roleMatchScore * 0.7 + workloadScore * 0.3) * 100)

          proposals.push({
            task_id: task.id,
            worker_id: worker.id,
            project_id: task.project_id,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            confidence_score: confidenceScore
          })

          // Update worker daily hours
          workerDailyHours[worker.id] = (workerDailyHours[worker.id] || 0) + shiftDuration
        })
      }
    })

    console.log(`Generated ${proposals.length} shift proposals`)

    // Log optimization run
    const { error: logError } = await supabaseClient
      .from('optimization_runs')
      .insert({
        run_date: targetDate.toISOString().split('T')[0],
        total_shifts_proposed: proposals.length,
        optimization_score: proposals.reduce((sum, p) => sum + p.confidence_score, 0) / Math.max(proposals.length, 1),
        auto_generated: auto_confirm,
        execution_time_ms: Date.now() - new Date().getTime()
      })

    if (logError) {
      console.error('Error logging optimization run:', logError)
    }

    // If auto_confirm is true, insert shifts directly
    if (auto_confirm && proposals.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('shifts')
        .insert(proposals.map(p => ({
          ...p,
          status: 'confirmed'
        })))

      if (insertError) {
        console.error('Error inserting shifts:', insertError)
        throw insertError
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        proposals,
        total_count: proposals.length,
        auto_confirmed: auto_confirm
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Optimization error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})