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
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('Session Validate - Auth header present:', !!authHeader);
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: authHeader ? { Authorization: authHeader } : {} },
      }
    )

    console.log('Session Validate - Starting session validation...');

    const body = await req.json().catch(() => ({ operation: 'general_access' }));
    const { operation } = body;
    
    // Get current user session
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    let currentUser = user;
    
    if (userError || !user) {
      console.log('Session Validate - No valid session, user error:', userError?.message);
      
      // If no auth header, we can't validate
      if (!authHeader) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'No authentication provided',
            details: 'Authorization header is required',
            action_required: 'login_required'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
          }
        )
      }
      
      // Try to refresh the session if we have an auth header
      try {
        const { data: refreshData, error: refreshError } = await supabaseClient.auth.refreshSession()
        
        if (refreshError || !refreshData.session?.user) {
          console.log('Session Validate - Refresh failed:', refreshError?.message);
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
        
        currentUser = refreshData.session.user;
        console.log('Session Validate - Session refreshed successfully');
      } catch (refreshErr) {
        console.error('Session Validate - Refresh error:', refreshErr);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Session refresh failed',
            details: (refreshErr as Error).message,
            action_required: 'login_required'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
          }
        )
      }
    }

    // Get enhanced role information with fallback
    let roleData = null;
    let role = 'worker';
    
    try {
      const { data, error: roleError } = await supabaseClient
        .rpc('get_current_user_role_enhanced')

      if (roleError) {
        console.error('Session Validate - Role function error:', roleError);
        // Fallback to basic role check
        const { data: basicRole } = await supabaseClient
          .rpc('get_current_user_role')
          .single();
        role = basicRole || 'worker';
      } else {
        roleData = data;
        role = data?.role || 'worker';
      }
    } catch (roleErr) {
      console.error('Session Validate - Role check failed:', roleErr);
      role = 'worker'; // Safe fallback
    }

    const isAdmin = role === 'admin';

    // Log the validation attempt (with error handling)
    try {
      await supabaseClient.rpc('log_critical_security_event', {
        event_type: 'SESSION_VALIDATION',
        severity: 'low',
        details: {
          operation,
          user_id: currentUser?.id,
          role,
          validation_success: true
        }
      });
    } catch (logErr) {
      console.warn('Session Validate - Logging failed:', logErr);
      // Continue without logging
    }

    // Check operation permissions
    const permissions = {
      assign_workers: isAdmin,
      manage_projects: isAdmin || role === 'manager',
      view_admin_panel: isAdmin,
      manage_users: isAdmin,
      general_access: true // Allow general access for all authenticated users
    };

    const hasPermission = permissions[operation as keyof typeof permissions] ?? false;

    if (!hasPermission && operation !== 'general_access') {
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
      user_id: currentUser?.id, 
      role, 
      operation,
      permission_granted: hasPermission 
    });

    return new Response(
      JSON.stringify({
        success: true,
        user_id: currentUser?.id,
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