import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RoleChangeRequest {
  user_id: string;
  new_role: 'admin' | 'manager' | 'worker';
  reason?: string;
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

    // Check if user is admin (only admins can change user roles)
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

    const { user_id, new_role, reason }: RoleChangeRequest = await req.json()

    // Validate input
    if (!user_id || !new_role) {
      return new Response(
        JSON.stringify({ error: 'User ID and new role are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!['admin', 'manager', 'worker'].includes(new_role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role specified' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Prevent admin from changing their own role
    if (user_id === user.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot change your own role' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Check if target user exists
    const { data: targetUser } = await supabaseClient
      .from('profiles')
      .select('id, full_name')
      .eq('id', user_id)
      .single()

    if (!targetUser) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Get current role
    const { data: currentRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user_id)
      .single()

    if (currentRole?.role === new_role) {
      return new Response(
        JSON.stringify({ error: 'User already has this role' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Update user role
    const { error: updateError } = await supabaseClient
      .from('user_roles')
      .upsert({
        user_id,
        role: new_role,
        assigned_by: user.id,
        assigned_at: new Date().toISOString()
      })

    if (updateError) {
      throw updateError
    }

    // Log the role change for audit purposes
    await supabaseClient
      .from('security_audit_log')
      .insert({
        user_id: user.id,
        action: 'ROLE_CHANGE',
        table_name: 'user_roles',
        record_id: user_id,
        old_values: { role: currentRole?.role },
        new_values: { role: new_role },
        metadata: {
          target_user: user_id,
          reason: reason || 'No reason provided'
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        message: `Role changed successfully from ${currentRole?.role || 'none'} to ${new_role}`,
        user_id,
        old_role: currentRole?.role,
        new_role
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in change-user-role function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})