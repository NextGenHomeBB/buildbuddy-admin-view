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

    console.log('Auth Debug - Starting authentication diagnosis...');

    // Get the current user from the session
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    console.log('Auth Debug - User from getUser():', { 
      user: user?.id, 
      error: userError?.message 
    });

    // Call our enhanced debug function
    const { data: debugResult, error: debugError } = await supabaseClient
      .rpc('debug_auth_state')

    console.log('Auth Debug - Debug function result:', { 
      debugResult, 
      error: debugError?.message 
    });

    // Get enhanced role information
    const { data: roleResult, error: roleError } = await supabaseClient
      .rpc('get_current_user_role_enhanced')

    console.log('Auth Debug - Enhanced role result:', { 
      roleResult, 
      error: roleError?.message 
    });

    // Try to refresh the session if there are issues
    let sessionRefreshResult = null;
    if (!user && req.headers.get('Authorization')) {
      try {
        const { data: refreshData, error: refreshError } = await supabaseClient.auth.refreshSession()
        sessionRefreshResult = {
          success: !refreshError,
          error: refreshError?.message,
          session: refreshData.session?.user?.id ? 'restored' : 'failed'
        };
        console.log('Auth Debug - Session refresh attempt:', sessionRefreshResult);
      } catch (refreshErr) {
        sessionRefreshResult = {
          success: false,
          error: (refreshErr as Error).message,
          session: 'failed'
        };
      }
    }

    // Check if user has admin role in user_roles table directly
    let directRoleCheck = null;
    if (user?.id) {
      const { data: userRoles, error: userRolesError } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single()

      directRoleCheck = {
        hasAdminRole: !!userRoles && !userRolesError,
        error: userRolesError?.message,
        role: userRoles?.role
      };
      console.log('Auth Debug - Direct role check:', directRoleCheck);
    }

    // Compile comprehensive debug information
    const response = {
      timestamp: new Date().toISOString(),
      session: {
        user_id: user?.id || null,
        user_email: user?.email || null,
        session_valid: !!user,
        authorization_header_present: !!req.headers.get('Authorization')
      },
      debug_function: {
        result: debugResult,
        error: debugError?.message || null
      },
      role_function: {
        result: roleResult,
        error: roleError?.message || null
      },
      session_refresh: sessionRefreshResult,
      direct_role_check: directRoleCheck,
      recommendations: []
    };

    // Add recommendations based on findings
    if (!user) {
      response.recommendations.push('No valid session found - user needs to log in again');
    }
    
    if (user && !directRoleCheck?.hasAdminRole) {
      response.recommendations.push('User authenticated but lacks admin role in database');
    }

    if (debugError || roleError) {
      response.recommendations.push('Database function errors detected - check RLS policies');
    }

    console.log('Auth Debug - Final response:', response);

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Auth Debug - Unexpected error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error during auth debug',
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})