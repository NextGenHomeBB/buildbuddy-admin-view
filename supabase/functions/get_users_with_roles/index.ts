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

    // Check if user has admin access through user_roles or organization membership
    const { data: globalAdmin } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    const { data: orgAdmin } = await supabaseClient
      .from('organization_members')
      .select('role, org_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('role', ['admin', 'owner'])
      .single()

    if (!globalAdmin && !orgAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // If user is org admin, only fetch users from the same organization
    let profilesQuery = supabaseClient
      .from('profiles')
      .select('id, full_name, avatar_url, created_at')

    if (orgAdmin && !globalAdmin) {
      // Get organization members for this org
      const { data: orgMembers } = await supabaseClient
        .from('organization_members')
        .select('user_id')
        .eq('org_id', orgAdmin.org_id)
        .eq('status', 'active')

      const memberIds = orgMembers?.map(m => m.user_id) || []
      profilesQuery = profilesQuery.in('id', memberIds)
    }

    const { data: profiles, error: profilesError } = await profilesQuery
      .order('created_at', { ascending: false })

    if (profilesError) {
      throw profilesError
    }

    // Fetch user roles for these profiles
    const profileIds = profiles?.map(p => p.id) || []
    const { data: userRoles } = await supabaseClient
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', profileIds)

    // Fetch organization memberships for these profiles
    const { data: orgMemberships } = await supabaseClient
      .from('organization_members')
      .select('user_id, role')
      .in('user_id', profileIds)
      .eq('status', 'active')

    // Combine profiles with their roles
    const usersWithRoles = (profiles || []).map(profile => {
      // Check for global admin role first
      const globalRole = userRoles?.find(ur => ur.user_id === profile.id)
      if (globalRole?.role === 'admin') {
        return {
          id: profile.id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          created_at: profile.created_at,
          role: 'admin'
        }
      }

      // Otherwise, get role from organization membership
      const orgRole = orgMemberships?.find(om => om.user_id === profile.id)
      const primaryRole = orgRole?.role || 'worker'

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