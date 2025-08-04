import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TimeSheetData {
  id: string;
  user_id: string;
  project_id: string | null;
  work_date: string;
  hours: number;
  note: string | null;
  location: string | null;
  shift_type: string | null;
  break_duration: number | null;
}

interface ExternalSyncPayload {
  employeeId: string;
  projectId: string;
  date: string;
  hours: number;
  description: string;
  location: string;
  type: string;
  breakDuration: number;
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

    const { timesheet_id } = await req.json();

    if (!timesheet_id) {
      return new Response(
        JSON.stringify({ error: 'timesheet_id is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🔄 Starting sync for timesheet: ${timesheet_id}`);

    // Fetch the timesheet from database
    const { data: timesheet, error: fetchError } = await supabaseClient
      .from('time_sheets')
      .select('*')
      .eq('id', timesheet_id)
      .single();

    if (fetchError || !timesheet) {
      console.error('❌ Failed to fetch timesheet:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Timesheet not found' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Prepare payload for external management system
    const externalPayload: ExternalSyncPayload = {
      employeeId: timesheet.user_id,
      projectId: timesheet.project_id || 'unassigned',
      date: timesheet.work_date,
      hours: timesheet.hours,
      description: timesheet.note || '',
      location: timesheet.location || '',
      type: timesheet.shift_type || 'regular',
      breakDuration: timesheet.break_duration || 0
    };

    console.log('📤 Sending to external system:', externalPayload);

    // Send to external management system
    const externalResponse = await fetch('https://api.management.local/time', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('MANAGEMENT_API_KEY')}`,
      },
      body: JSON.stringify(externalPayload),
    });

    let syncStatus = 'failed';
    let errorMessage = null;

    if (externalResponse.ok) {
      syncStatus = 'synced';
      console.log('✅ Successfully synced to external system');
    } else {
      const errorText = await externalResponse.text();
      errorMessage = `External API error: ${externalResponse.status} - ${errorText}`;
      console.error('❌ External sync failed:', errorMessage);
    }

    // Update timesheet with sync status
    const { error: updateError } = await supabaseClient
      .from('time_sheets')
      .update({ 
        sync_status: syncStatus,
        sync_error: errorMessage,
        synced_at: syncStatus === 'synced' ? new Date().toISOString() : null
      })
      .eq('id', timesheet_id);

    if (updateError) {
      console.error('❌ Failed to update sync status:', updateError);
    }

    // If external sync failed, implement retry logic
    if (syncStatus === 'failed') {
      // Schedule retry (you could implement a more sophisticated retry mechanism)
      console.log('🔄 Scheduling retry for failed sync');
      
      // For now, just return the error
      return new Response(
        JSON.stringify({ 
          error: 'Sync failed', 
          details: errorMessage,
          timesheet_id: timesheet_id 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        timesheet_id: timesheet_id,
        sync_status: syncStatus 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Sync function error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})