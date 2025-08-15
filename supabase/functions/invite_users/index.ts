import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InviteRequest {
  emails: string[];
  role: 'admin' | 'manager' | 'worker';
  org_id: string;
  send_welcome: boolean;
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

    const { emails, role, org_id, send_welcome }: InviteRequest = await req.json()

    // Validate org_id first
    if (!org_id) {
      return new Response(
        JSON.stringify({ error: 'Organization ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Check if user has admin/owner role in the specific organization
    const { data: userOrgRole, error: orgRoleError } = await supabaseClient
      .rpc('get_user_org_role', { p_org_id: org_id })

    console.log('User org role check:', { userOrgRole, orgRoleError, userId: user.id, orgId: org_id })

    if (orgRoleError) {
      console.error('Error checking user org role:', orgRoleError)
      return new Response(
        JSON.stringify({ error: 'Failed to verify permissions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (!userOrgRole || !['admin', 'owner'].includes(userOrgRole)) {
      return new Response(
        JSON.stringify({ error: 'Admin or owner access required for this organization' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Enhanced input validation
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Email list is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Limit number of emails per request
    if (emails.length > 50) {
      return new Response(
        JSON.stringify({ error: 'Maximum 50 emails allowed per request' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidEmails = emails.filter(email => !emailRegex.test(email))
    if (invalidEmails.length > 0) {
      return new Response(
        JSON.stringify({ error: `Invalid email format: ${invalidEmails.join(', ')}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!['admin', 'manager', 'worker'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role specified' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }


    const results = []
    const errors = []

    // Process each email invitation
    for (const email of emails) {
      try {
        // Check if invitation already exists for this org/email
        const { data: existingInvite } = await supabaseClient
          .from('invitations')
          .select('id, status')
          .eq('org_id', org_id)
          .eq('email', email)
          .single()

        if (existingInvite && existingInvite.status === 'pending') {
          errors.push({ email, error: 'Invitation already pending for this organization' })
          continue
        }

        // Use the invite_user RPC function
        const { data: invitation, error: inviteError } = await supabaseClient
          .rpc('invite_user', {
            p_org_id: org_id,
            p_email: email,
            p_role: role,
            p_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          })

        if (inviteError) {
          errors.push({ email, error: inviteError.message })
          continue
        }

        // Send invitation email if requested
        if (send_welcome) {
          // Here you would integrate with your email service (Resend, etc.)
          // For now, we'll just log the intention
          console.log(`Would send invitation email to: ${email}`)
        }

        results.push({
          email,
          invitation_data: invitation,
          status: 'sent'
        })

      } catch (error) {
        console.error(`Error processing invitation for ${email}:`, error)
        errors.push({ email, error: error.message })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        invited: results,
        errors: errors,
        total_sent: results.length,
        total_errors: errors.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in invite-users function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})