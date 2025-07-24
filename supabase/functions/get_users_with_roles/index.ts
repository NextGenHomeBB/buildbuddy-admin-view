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

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, full_name, avatar_url, created_at')
      .order('created_at', { ascending: false })

    if (profilesError) {
      throw profilesError
    }

    // Fetch all user roles
    const { data: userRoles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('user_id, role')

    if (rolesError) {
      throw rolesError
    }

    // Combine profiles with their roles
    const usersWithRoles = (profiles || []).map(profile => {
      const userRoleRecords = userRoles?.filter(ur => ur.user_id === profile.id) || []
      let primaryRole = 'worker' // default role
      
      // Prioritize roles: admin > manager > worker
      const roleValues = userRoleRecords.map(ur => ur.role)
      if (roleValues.includes('admin')) {
        primaryRole = 'admin'
      } else if (roleValues.includes('manager')) {
        primaryRole = 'manager'
      } else if (roleValues.includes('worker')) {
        primaryRole = 'worker'
      }

      return {
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
        role: primaryRole
      }
    })

    return new Response(
      JSON.stringify({ users: usersWithRoles }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})