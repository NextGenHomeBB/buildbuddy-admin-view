import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InviteRequest {
  emails: string[];
  role: 'admin' | 'manager' | 'worker';
  message?: string;
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

    // Enhanced security: Check rate limiting for user invitations
    const { data: rateLimitCheck, error: rateLimitError } = await supabaseClient
      .rpc('check_rate_limit', {
        operation_name: 'user_invite',
        max_attempts: 10,
        window_minutes: 60
      })

    if (rateLimitError || !rateLimitCheck) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Too many invitations sent. Please try again later.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      )
    }

    // Check if user is admin (only admins can invite users)
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

    const { emails, role, message, send_welcome }: InviteRequest = await req.json()

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

    // Validate message length if provided
    if (message && message.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Message must be under 500 characters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const results = []
    const errors = []

    // Process each email invitation
    for (const email of emails) {
      try {
        // Check if user already exists
        const { data: existingUser } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('id', email) // This would need to be updated based on how you track emails
          .single()

        if (existingUser) {
          errors.push({ email, error: 'User already exists' })
          continue
        }

        // Create invitation record
        const { data: invitation, error: inviteError } = await supabaseClient
          .from('user_invitations')
          .insert({
            email,
            role,
            invited_by: user.id,
            message,
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          })
          .select()
          .single()

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
          invitation_id: invitation.id,
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