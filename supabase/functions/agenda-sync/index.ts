import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  location?: string;
  external_id?: string;
  provider: 'google' | 'outlook' | 'internal';
  sync_status: 'pending' | 'synced' | 'error';
  user_id: string;
}

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  updated: string;
}

interface OutlookEvent {
  id: string;
  subject: string;
  body?: { content: string };
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName: string };
  lastModifiedDateTime: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('Starting calendar sync process...');

    // Get all users with calendar sync enabled
    const { data: syncSettings, error: settingsError } = await supabase
      .from('calendar_sync_settings')
      .select('*')
      .eq('auto_sync_enabled', true);

    if (settingsError) {
      console.error('Error fetching sync settings:', settingsError);
      throw settingsError;
    }

    console.log(`Found ${syncSettings?.length || 0} users with sync enabled`);

    for (const settings of syncSettings || []) {
      try {
        await syncUserCalendar(supabase, settings);
      } catch (error) {
        console.error(`Error syncing calendar for user ${settings.user_id}:`, error);
        // Continue with other users even if one fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synchronized calendars for ${syncSettings?.length || 0} users`,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Calendar sync error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function syncUserCalendar(supabase: any, settings: any) {
  console.log(`Syncing calendar for user: ${settings.user_id}`);

  // Get user's OAuth tokens
  const { data: tokens, error: tokenError } = await supabase
    .from('calendar_oauth_tokens')
    .select('*')
    .eq('user_id', settings.user_id);

  if (tokenError) {
    console.error('Error fetching tokens:', tokenError);
    return;
  }

  // Sync Google Calendar if enabled
  if (settings.google_enabled) {
    const googleToken = tokens?.find(t => t.provider === 'google');
    if (googleToken) {
      await syncGoogleCalendar(supabase, settings, googleToken);
    }
  }

  // Sync Outlook Calendar if enabled
  if (settings.outlook_enabled) {
    const outlookToken = tokens?.find(t => t.provider === 'outlook');
    if (outlookToken) {
      await syncOutlookCalendar(supabase, settings, outlookToken);
    }
  }
}

async function syncGoogleCalendar(supabase: any, settings: any, token: any) {
  console.log(`Syncing Google Calendar for user: ${settings.user_id}`);

  try {
    // Check if token needs refresh
    const accessToken = await refreshTokenIfNeeded(token, 'google');
    
    const calendarId = settings.google_calendar_id || 'primary';
    
    // Get recent changes from Google Calendar (last 24 hours)
    const timeMin = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${timeMin}&updatedMin=${timeMin}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.status}`);
    }

    const data = await response.json();
    const events: GoogleCalendarEvent[] = data.items || [];

    console.log(`Found ${events.length} updated Google Calendar events`);

    // Process each event
    for (const event of events) {
      await processGoogleEvent(supabase, settings.user_id, event);
    }

    // Push BuildBuddy events to Google Calendar
    if (settings.sync_direction === 'export_only' || settings.sync_direction === 'bidirectional') {
      await pushEventsToGoogle(supabase, settings, accessToken);
    }

  } catch (error) {
    console.error('Google Calendar sync error:', error);
    // Update sync status to error
    await supabase
      .from('calendar_events')
      .update({ 
        sync_status: 'error',
        sync_error: error.message 
      })
      .eq('user_id', settings.user_id)
      .eq('provider', 'google');
  }
}

async function syncOutlookCalendar(supabase: any, settings: any, token: any) {
  console.log(`Syncing Outlook Calendar for user: ${settings.user_id}`);

  try {
    const accessToken = await refreshTokenIfNeeded(token, 'outlook');
    
    // Get recent changes from Outlook Calendar (last 24 hours)
    const timeFilter = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/events?$filter=lastModifiedDateTime ge ${timeFilter}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Outlook Calendar API error: ${response.status}`);
    }

    const data = await response.json();
    const events: OutlookEvent[] = data.value || [];

    console.log(`Found ${events.length} updated Outlook Calendar events`);

    for (const event of events) {
      await processOutlookEvent(supabase, settings.user_id, event);
    }

    // Push BuildBuddy events to Outlook
    if (settings.sync_direction === 'export_only' || settings.sync_direction === 'bidirectional') {
      await pushEventsToOutlook(supabase, settings, accessToken);
    }

  } catch (error) {
    console.error('Outlook Calendar sync error:', error);
    await supabase
      .from('calendar_events')
      .update({ 
        sync_status: 'error',
        sync_error: error.message 
      })
      .eq('user_id', settings.user_id)
      .eq('provider', 'outlook');
  }
}

async function processGoogleEvent(supabase: any, userId: string, event: GoogleCalendarEvent) {
  const eventData = {
    user_id: userId,
    title: event.summary || 'Untitled Event',
    description: event.description,
    starts_at: event.start.dateTime || event.start.date,
    ends_at: event.end.dateTime || event.end.date,
    all_day: !event.start.dateTime,
    location: event.location,
    external_id: event.id,
    provider: 'google',
    sync_status: 'synced',
    last_synced: new Date().toISOString()
  };

  // Check if event already exists
  const { data: existing } = await supabase
    .from('calendar_events')
    .select('id')
    .eq('external_id', event.id)
    .eq('provider', 'google')
    .eq('user_id', userId)
    .single();

  if (existing) {
    // Update existing event
    await supabase
      .from('calendar_events')
      .update(eventData)
      .eq('id', existing.id);
  } else {
    // Insert new event
    await supabase
      .from('calendar_events')
      .insert(eventData);
  }
}

async function processOutlookEvent(supabase: any, userId: string, event: OutlookEvent) {
  const eventData = {
    user_id: userId,
    title: event.subject || 'Untitled Event',
    description: event.body?.content,
    starts_at: event.start.dateTime,
    ends_at: event.end.dateTime,
    all_day: false, // Outlook API doesn't have simple all-day detection
    location: event.location?.displayName,
    external_id: event.id,
    provider: 'outlook',
    sync_status: 'synced',
    last_synced: new Date().toISOString()
  };

  const { data: existing } = await supabase
    .from('calendar_events')
    .select('id')
    .eq('external_id', event.id)
    .eq('provider', 'outlook')
    .eq('user_id', userId)
    .single();

  if (existing) {
    await supabase
      .from('calendar_events')
      .update(eventData)
      .eq('id', existing.id);
  } else {
    await supabase
      .from('calendar_events')
      .insert(eventData);
  }
}

async function pushEventsToGoogle(supabase: any, settings: any, accessToken: string) {
  // Get pending BuildBuddy events to push
  const { data: events } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', settings.user_id)
    .eq('provider', 'internal')
    .eq('sync_status', 'pending');

  for (const event of events || []) {
    try {
      const googleEvent = {
        summary: event.title,
        description: event.description,
        start: event.all_day 
          ? { date: event.starts_at.split('T')[0] }
          : { dateTime: event.starts_at },
        end: event.all_day
          ? { date: event.ends_at.split('T')[0] }
          : { dateTime: event.ends_at },
        location: event.location
      };

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${settings.google_calendar_id || 'primary'}/events`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(googleEvent)
        }
      );

      if (response.ok) {
        const createdEvent = await response.json();
        await supabase
          .from('calendar_events')
          .update({
            sync_status: 'synced',
            external_id: createdEvent.id,
            last_synced: new Date().toISOString()
          })
          .eq('id', event.id);
      }
    } catch (error) {
      console.error('Error pushing event to Google:', error);
    }
  }
}

async function pushEventsToOutlook(supabase: any, settings: any, accessToken: string) {
  const { data: events } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', settings.user_id)
    .eq('provider', 'internal')
    .eq('sync_status', 'pending');

  for (const event of events || []) {
    try {
      const outlookEvent = {
        subject: event.title,
        body: { content: event.description || '', contentType: 'text' },
        start: { dateTime: event.starts_at, timeZone: 'UTC' },
        end: { dateTime: event.ends_at, timeZone: 'UTC' },
        location: event.location ? { displayName: event.location } : undefined
      };

      const response = await fetch(
        'https://graph.microsoft.com/v1.0/me/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(outlookEvent)
        }
      );

      if (response.ok) {
        const createdEvent = await response.json();
        await supabase
          .from('calendar_events')
          .update({
            sync_status: 'synced',
            external_id: createdEvent.id,
            last_synced: new Date().toISOString()
          })
          .eq('id', event.id);
      }
    } catch (error) {
      console.error('Error pushing event to Outlook:', error);
    }
  }
}

async function refreshTokenIfNeeded(token: any, provider: 'google' | 'outlook'): Promise<string> {
  // Check if token is expired
  if (new Date() < new Date(token.expires_at)) {
    return token.access_token;
  }

  // Refresh the token
  const refreshUrl = provider === 'google' 
    ? 'https://oauth2.googleapis.com/token'
    : 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: token.refresh_token,
    client_id: Deno.env.get(provider === 'google' ? 'GOOGLE_CLIENT_ID' : 'MICROSOFT_CLIENT_ID')!,
    client_secret: Deno.env.get(provider === 'google' ? 'GOOGLE_CLIENT_SECRET' : 'MICROSOFT_CLIENT_SECRET')!
  });

  const response = await fetch(refreshUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const data = await response.json();
  
  // Update token in database
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  await supabase
    .from('calendar_oauth_tokens')
    .update({
      access_token: data.access_token,
      expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      refresh_token: data.refresh_token || token.refresh_token
    })
    .eq('id', token.id);

  return data.access_token;
}