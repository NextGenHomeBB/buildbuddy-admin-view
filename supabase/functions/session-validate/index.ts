import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      }
    )

    console.log('Session Validate - Starting session validation...');

    const { operation } = await req.json();
    
    // Get current user session
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      console.log('Session Validate - No valid session, attempting refresh...');
      
      // Try to refresh the session
      const { data: refreshData, error: refreshError } = await supabaseClient.auth.refreshSession()
      
      if (refreshError || !refreshData.session) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Session validation failed',
            details: 'No valid session found and refresh failed',
            action_required: 'login_required'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
          }
        )
      }
      
      console.log('Session Validate - Session refreshed successfully');
    }

    // Get enhanced role information
    const { data: roleData, error: roleError } = await supabaseClient
      .rpc('get_current_user_role_enhanced')

    if (roleError) {
      console.error('Session Validate - Role function error:', roleError);
    }

    const role = roleData?.role || 'worker';
    const isAdmin = role === 'admin';

    // Log the validation attempt
    await supabaseClient.rpc('log_critical_security_event', {
      event_type: 'SESSION_VALIDATION',
      severity: 'low',
      details: {
        operation,
        user_id: user?.id,
        role,
        validation_success: true
      }
    });

    // Check operation permissions
    const permissions = {
      assign_workers: isAdmin,
      manage_projects: isAdmin || role === 'manager',
      view_admin_panel: isAdmin,
      manage_users: isAdmin
    };

    const hasPermission = permissions[operation as keyof typeof permissions] ?? false;

    if (!hasPermission) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Insufficient permissions',
          details: `User role '${role}' cannot perform operation '${operation}'`,
          current_role: role,
          required_role: operation === 'assign_workers' ? 'admin' : 'admin or manager'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      )
    }

    console.log('Session Validate - Validation successful:', { 
      user_id: user.id, 
      role, 
      operation,
      permission_granted: hasPermission 
    });

    return new Response(
      JSON.stringify({
        success: true,
        user_id: user.id,
        role,
        permissions,
        operation_allowed: hasPermission,
        session_valid: true,
        debug_info: roleData?.debug
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Session Validate - Unexpected error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error during session validation',
        message: (error as Error).message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})