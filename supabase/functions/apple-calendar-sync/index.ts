import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AppleCalendarCredentials {
  id: string;
  user_id: string;
  username: string;
  app_password: string;
  caldav_url: string;
}

interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  starts_at: string;
  ends_at: string;
  location?: string;
  all_day: boolean;
  external_id?: string;
  provider?: string;
  sync_status?: string;
}

interface CalDAVEvent {
  uid: string;
  summary: string;
  dtstart: string;
  dtend: string;
  description?: string;
  location?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get users with Apple Calendar sync enabled
    const { data: settings, error: settingsError } = await supabase
      .from('calendar_sync_settings')
      .select('*')
      .eq('apple_enabled', true)
      .eq('auto_sync_enabled', true);

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      return new Response(JSON.stringify({ error: settingsError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    for (const setting of settings || []) {
      try {
        await syncUserAppleCalendar(supabase, setting);
      } catch (error) {
        console.error(`Error syncing calendar for user ${setting.user_id}:`, error);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      synced_users: settings?.length || 0 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Apple Calendar sync error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function syncUserAppleCalendar(supabase: any, settings: any) {
  // Get Apple Calendar credentials
  const { data: credentials, error: credError } = await supabase
    .from('apple_calendar_credentials')
    .select('*')
    .eq('user_id', settings.user_id)
    .single();

  if (credError || !credentials) {
    console.log(`No Apple credentials found for user ${settings.user_id}`);
    return;
  }

  try {
    // Fetch events from Apple Calendar via CalDAV
    if (settings.sync_direction === 'external_to_internal' || settings.sync_direction === 'bidirectional') {
      await fetchAppleCalendarEvents(supabase, settings, credentials);
    }

    // Push internal events to Apple Calendar
    if (settings.sync_direction === 'internal_to_external' || settings.sync_direction === 'bidirectional') {
      await pushEventsToApple(supabase, settings, credentials);
    }

  } catch (error) {
    console.error('Apple Calendar sync error:', error);
    throw error;
  }
}

async function fetchAppleCalendarEvents(supabase: any, settings: any, credentials: AppleCalendarCredentials) {
  const caldavUrl = `${credentials.caldav_url}${credentials.username}/calendars/`;
  const auth = btoa(`${credentials.username}:${credentials.app_password}`);
  
  // Get current date range (last 30 days to next 30 days)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);

  try {
    // CalDAV REPORT request to fetch events
    const caldavBody = `<?xml version="1.0" encoding="utf-8" ?>
      <C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
        <D:prop>
          <D:getetag/>
          <C:calendar-data/>
        </D:prop>
        <C:filter>
          <C:comp-filter name="VCALENDAR">
            <C:comp-filter name="VEVENT">
              <C:time-range start="${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z"
                            end="${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z"/>
            </C:comp-filter>
          </C:comp-filter>
        </C:filter>
      </C:calendar-query>`;

    const response = await fetch(caldavUrl, {
      method: 'REPORT',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/xml; charset=utf-8',
        'Depth': '1',
      },
      body: caldavBody,
    });

    if (response.ok) {
      const xmlText = await response.text();
      const events = parseCalDAVResponse(xmlText);
      
      // Process each event
      for (const event of events) {
        await processAppleEvent(supabase, settings.user_id, event);
      }
    }
  } catch (error) {
    console.error('Error fetching Apple Calendar events:', error);
  }
}

async function pushEventsToApple(supabase: any, settings: any, credentials: AppleCalendarCredentials) {
  // Get internal events that need to be synced to Apple Calendar
  const { data: events, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', settings.user_id)
    .eq('sync_status', 'pending')
    .is('provider', null);

  if (error || !events) return;

  const caldavUrl = `${credentials.caldav_url}${credentials.username}/calendars/`;
  const auth = btoa(`${credentials.username}:${credentials.app_password}`);

  for (const event of events) {
    try {
      const icalData = createICalEvent(event);
      const eventUrl = `${caldavUrl}${event.id}.ics`;

      const response = await fetch(eventUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'text/calendar; charset=utf-8',
        },
        body: icalData,
      });

      if (response.ok) {
        // Update sync status
        await supabase
          .from('calendar_events')
          .update({ 
            sync_status: 'synced',
            provider: 'apple',
            external_id: event.id,
            last_synced: new Date().toISOString()
          })
          .eq('id', event.id);
      }
    } catch (error) {
      console.error('Error pushing event to Apple Calendar:', error);
    }
  }
}

function parseCalDAVResponse(xmlText: string): CalDAVEvent[] {
  const events: CalDAVEvent[] = [];
  
  // Basic XML parsing for VEVENT components
  // In production, use a proper XML/iCal parser
  const veventMatches = xmlText.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g);
  
  if (veventMatches) {
    for (const vevent of veventMatches) {
      const event: Partial<CalDAVEvent> = {};
      
      const uid = vevent.match(/UID:(.*)/)?.[1]?.trim();
      const summary = vevent.match(/SUMMARY:(.*)/)?.[1]?.trim();
      const dtstart = vevent.match(/DTSTART:(.*)/)?.[1]?.trim();
      const dtend = vevent.match(/DTEND:(.*)/)?.[1]?.trim();
      const description = vevent.match(/DESCRIPTION:(.*)/)?.[1]?.trim();
      const location = vevent.match(/LOCATION:(.*)/)?.[1]?.trim();
      
      if (uid && summary && dtstart && dtend) {
        events.push({
          uid,
          summary,
          dtstart,
          dtend,
          description,
          location,
        });
      }
    }
  }
  
  return events as CalDAVEvent[];
}

async function processAppleEvent(supabase: any, userId: string, event: CalDAVEvent) {
  // Convert CalDAV datetime to ISO string
  const startDate = parseCalDAVDate(event.dtstart);
  const endDate = parseCalDAVDate(event.dtend);
  
  if (!startDate || !endDate) return;

  const eventData = {
    user_id: userId,
    title: event.summary,
    description: event.description || '',
    starts_at: startDate,
    ends_at: endDate,
    location: event.location || '',
    all_day: event.dtstart.length === 8, // DATE vs DATETIME format
    external_id: event.uid,
    provider: 'apple',
    sync_status: 'synced',
    last_synced: new Date().toISOString(),
  };

  // Upsert the event
  await supabase
    .from('calendar_events')
    .upsert(eventData, { 
      onConflict: 'external_id,provider,user_id',
      ignoreDuplicates: false 
    });
}

function parseCalDAVDate(dateStr: string): string | null {
  try {
    // Handle different CalDAV date formats
    if (dateStr.length === 8) {
      // DATE format: YYYYMMDD
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      return `${year}-${month}-${day}T00:00:00.000Z`;
    } else if (dateStr.includes('T')) {
      // DATETIME format: YYYYMMDDTHHMMSSZ
      const clean = dateStr.replace(/[^\dT]/g, '');
      const year = clean.substring(0, 4);
      const month = clean.substring(4, 6);
      const day = clean.substring(6, 8);
      const hour = clean.substring(9, 11);
      const minute = clean.substring(11, 13);
      const second = clean.substring(13, 15);
      return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
    }
    return null;
  } catch (error) {
    console.error('Error parsing CalDAV date:', dateStr, error);
    return null;
  }
}

function createICalEvent(event: CalendarEvent): string {
  const startDate = new Date(event.starts_at);
  const endDate = new Date(event.ends_at);
  
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Construction Calendar//EN
BEGIN:VEVENT
UID:${event.id}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ''}
LOCATION:${event.location || ''}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
}