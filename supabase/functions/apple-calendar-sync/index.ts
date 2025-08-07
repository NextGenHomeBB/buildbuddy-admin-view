import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

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
  etag?: string;
  rrule?: string;
  status?: string;
}

interface CalDAVCalendar {
  href: string;
  displayName: string;
  ctag: string;
  supportedComponents: string[];
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

    // Check if this is a test connection request
    let requestBody: any = {};
    try {
      requestBody = await req.json();
    } catch {
      // No body or invalid JSON, continue with normal sync
    }

    if (requestBody.test_connection && requestBody.user_id) {
      console.log(`Testing Apple Calendar connection for user ${requestBody.user_id}`);
      
      // Get credentials for the specific user
      const { data: credentials, error: credError } = await supabase
        .from('apple_calendar_credentials')
        .select('*')
        .eq('user_id', requestBody.user_id)
        .single();

      if (credError || !credentials) {
        return new Response(JSON.stringify({ 
          error: 'No Apple Calendar credentials found' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Test the connection by discovering calendars
      const calendars = await discoverCalendars(credentials);
      
      return new Response(JSON.stringify({ 
        success: true, 
        calendars: calendars.map(cal => ({ name: cal.displayName, href: cal.href })),
        message: `Connected successfully! Found ${calendars.length} calendar(s).`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Normal sync process
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

    let syncResults = [];
    for (const setting of settings || []) {
      try {
        await syncUserAppleCalendar(supabase, setting);
        syncResults.push({ user_id: setting.user_id, status: 'success' });
      } catch (error) {
        console.error(`Error syncing calendar for user ${setting.user_id}:`, error);
        syncResults.push({ user_id: setting.user_id, status: 'error', error: error.message });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      synced_users: settings?.length || 0,
      results: syncResults
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
  console.log(`Starting Apple Calendar sync for user ${settings.user_id}`);
  
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
    // Test connection and discover calendars
    const calendars = await discoverCalendars(credentials);
    if (calendars.length === 0) {
      console.log(`No calendars found for user ${settings.user_id}`);
      return;
    }

    // Use the first calendar or specified calendar
    const targetCalendar = calendars[0]; // In production, allow user to select
    console.log(`Using calendar: ${targetCalendar.displayName}`);

    // Fetch events from Apple Calendar via CalDAV
    if (settings.sync_direction === 'external_to_internal' || settings.sync_direction === 'bidirectional') {
      await fetchAppleCalendarEvents(supabase, settings, credentials, targetCalendar);
    }

    // Push internal events to Apple Calendar
    if (settings.sync_direction === 'internal_to_external' || settings.sync_direction === 'bidirectional') {
      await pushEventsToApple(supabase, settings, credentials, targetCalendar);
    }

    console.log(`Apple Calendar sync completed for user ${settings.user_id}`);

  } catch (error) {
    console.error('Apple Calendar sync error:', error);
    
    // Update sync settings with error info
    await supabase
      .from('calendar_sync_settings')
      .update({ 
        last_sync_error: error.message,
        last_sync_attempt: new Date().toISOString()
      })
      .eq('user_id', settings.user_id);
    
    throw error;
  }
}

async function discoverCalendars(credentials: AppleCalendarCredentials): Promise<CalDAVCalendar[]> {
  const caldavUrl = `${credentials.caldav_url}${credentials.username}/calendars/`;
  const auth = btoa(`${credentials.username}:${credentials.app_password}`);
  
  try {
    const propfindBody = `<?xml version="1.0" encoding="utf-8" ?>
      <d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
        <d:prop>
          <d:displayname />
          <c:calendar-description />
          <c:supported-calendar-component-set />
          <d:getctag />
        </d:prop>
      </d:propfind>`;

    const response = await fetch(caldavUrl, {
      method: 'PROPFIND',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/xml; charset=utf-8',
        'Depth': '1',
      },
      body: propfindBody,
    });

    if (!response.ok) {
      throw new Error(`CalDAV discovery failed: ${response.status} ${response.statusText}`);
    }

    const xmlText = await response.text();
    return parseCalendarList(xmlText, caldavUrl);
  } catch (error) {
    console.error('Calendar discovery error:', error);
    throw new Error(`Failed to discover calendars: ${error.message}`);
  }
}

async function fetchAppleCalendarEvents(supabase: any, settings: any, credentials: AppleCalendarCredentials, calendar: CalDAVCalendar) {
  const auth = btoa(`${credentials.username}:${credentials.app_password}`);
  
  // Get current date range (last 30 days to next 30 days)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);

  try {
    // Check if we have a stored CTAG for incremental sync
    const { data: lastSync } = await supabase
      .from('calendar_sync_settings')
      .select('apple_calendar_ctag, last_sync_time')
      .eq('user_id', settings.user_id)
      .single();

    // Only do full sync if CTAG changed or no previous sync
    if (lastSync?.apple_calendar_ctag === calendar.ctag && lastSync?.last_sync_time) {
      console.log('Calendar unchanged since last sync, skipping fetch');
      return;
    }

    // CalDAV REPORT request to fetch events with ETags
    const caldavBody = `<?xml version="1.0" encoding="utf-8" ?>
      <C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
        <D:prop>
          <D:getetag/>
          <C:calendar-data/>
        </D:prop>
        <C:filter>
          <C:comp-filter name="VCALENDAR">
            <C:comp-filter name="VEVENT">
              <C:time-range start="${formatCalDAVDate(startDate)}"
                            end="${formatCalDAVDate(endDate)}"/>
            </C:comp-filter>
          </C:comp-filter>
        </C:filter>
      </C:calendar-query>`;

    const response = await fetch(calendar.href, {
      method: 'REPORT',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/xml; charset=utf-8',
        'Depth': '1',
      },
      body: caldavBody,
    });

    if (!response.ok) {
      throw new Error(`CalDAV REPORT failed: ${response.status} ${response.statusText}`);
    }

    const xmlText = await response.text();
    const events = parseCalDAVResponse(xmlText);
    
    console.log(`Fetched ${events.length} events from Apple Calendar`);
    
    // Process each event with retry logic
    for (const event of events) {
      try {
        await processAppleEvent(supabase, settings.user_id, event);
      } catch (error) {
        console.error(`Failed to process event ${event.uid}:`, error);
        // Continue with other events
      }
    }

    // Update CTAG and sync time
    await supabase
      .from('calendar_sync_settings')
      .update({ 
        apple_calendar_ctag: calendar.ctag,
        last_sync_time: new Date().toISOString(),
        last_sync_error: null
      })
      .eq('user_id', settings.user_id);

  } catch (error) {
    console.error('Error fetching Apple Calendar events:', error);
    throw new Error(`Failed to fetch events: ${error.message}`);
  }
}

async function pushEventsToApple(supabase: any, settings: any, credentials: AppleCalendarCredentials, calendar: CalDAVCalendar) {
  // Get internal events that need to be synced to Apple Calendar
  const { data: events, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', settings.user_id)
    .eq('sync_status', 'pending')
    .is('provider', null);

  if (error || !events || events.length === 0) {
    console.log('No events to push to Apple Calendar');
    return;
  }

  const auth = btoa(`${credentials.username}:${credentials.app_password}`);
  console.log(`Pushing ${events.length} events to Apple Calendar`);

  for (const event of events) {
    try {
      const icalData = createICalEvent(event);
      const eventUrl = `${calendar.href}${event.id}.ics`;

      // Use If-None-Match to prevent conflicts
      const response = await fetch(eventUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'text/calendar; charset=utf-8',
          'If-None-Match': '*', // Only create if doesn't exist
        },
        body: icalData,
      });

      if (response.ok || response.status === 201) {
        const etag = response.headers.get('ETag');
        
        // Update sync status with ETag for future updates
        await supabase
          .from('calendar_events')
          .update({ 
            sync_status: 'synced',
            provider: 'apple',
            external_id: event.id,
            last_synced: new Date().toISOString(),
            sync_etag: etag
          })
          .eq('id', event.id);
          
        console.log(`Successfully pushed event: ${event.title}`);
      } else if (response.status === 412) {
        // Precondition failed - event already exists
        console.log(`Event ${event.title} already exists in Apple Calendar`);
        
        await supabase
          .from('calendar_events')
          .update({ 
            sync_status: 'conflict',
            sync_error: 'Event already exists in Apple Calendar'
          })
          .eq('id', event.id);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error pushing event ${event.title} to Apple Calendar:`, error);
      
      // Mark event with sync error
      await supabase
        .from('calendar_events')
        .update({ 
          sync_status: 'error',
          sync_error: error.message
        })
        .eq('id', event.id);
    }
  }
}

function parseCalendarList(xmlText: string, baseUrl: string): CalDAVCalendar[] {
  const calendars: CalDAVCalendar[] = [];
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");
    const responses = doc.querySelectorAll("response");
    
    responses.forEach(response => {
      const href = response.querySelector("href")?.textContent;
      const displayName = response.querySelector("displayname")?.textContent;
      const ctag = response.querySelector("getctag")?.textContent;
      const supportedComponents = response.querySelector("supported-calendar-component-set");
      
      if (href && displayName && ctag && href.endsWith('/')) {
        calendars.push({
          href: href.startsWith('http') ? href : baseUrl + href.replace(/^\//, ''),
          displayName,
          ctag,
          supportedComponents: ['VEVENT'] // Default to supporting events
        });
      }
    });
  } catch (error) {
    console.error('Error parsing calendar list:', error);
  }
  
  return calendars;
}

function parseCalDAVResponse(xmlText: string): CalDAVEvent[] {
  const events: CalDAVEvent[] = [];
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");
    const responses = doc.querySelectorAll("response");
    
    responses.forEach(response => {
      const etag = response.querySelector("getetag")?.textContent;
      const calendarData = response.querySelector("calendar-data")?.textContent;
      
      if (calendarData) {
        const parsedEvents = parseICalendarData(calendarData, etag);
        events.push(...parsedEvents);
      }
    });
  } catch (error) {
    console.error('Error parsing CalDAV response:', error);
    // Fallback to regex parsing
    return parseCalDAVResponseFallback(xmlText);
  }
  
  return events;
}

function parseCalDAVResponseFallback(xmlText: string): CalDAVEvent[] {
  const events: CalDAVEvent[] = [];
  
  // Basic XML parsing for VEVENT components as fallback
  const veventMatches = xmlText.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g);
  
  if (veventMatches) {
    for (const vevent of veventMatches) {
      const event = parseICalendarEvent(vevent);
      if (event) {
        events.push(event);
      }
    }
  }
  
  return events;
}

function parseICalendarData(icalData: string, etag?: string): CalDAVEvent[] {
  const events: CalDAVEvent[] = [];
  const veventMatches = icalData.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g);
  
  if (veventMatches) {
    for (const vevent of veventMatches) {
      const event = parseICalendarEvent(vevent, etag);
      if (event) {
        events.push(event);
      }
    }
  }
  
  return events;
}

function parseICalendarEvent(vevent: string, etag?: string): CalDAVEvent | null {
  const event: Partial<CalDAVEvent> = {};
  
  // Parse iCalendar properties with proper unfolding
  const unfoldedVevent = vevent.replace(/\r?\n[ \t]/g, '');
  const lines = unfoldedVevent.split(/\r?\n/);
  
  for (const line of lines) {
    const [property, ...valueParts] = line.split(':');
    const value = valueParts.join(':');
    
    if (!property || !value) continue;
    
    const [propName, ...paramParts] = property.split(';');
    const params = paramParts.join(';');
    
    switch (propName) {
      case 'UID':
        event.uid = unescapeICalValue(value);
        break;
      case 'SUMMARY':
        event.summary = unescapeICalValue(value);
        break;
      case 'DESCRIPTION':
        event.description = unescapeICalValue(value);
        break;
      case 'LOCATION':
        event.location = unescapeICalValue(value);
        break;
      case 'DTSTART':
        event.dtstart = value;
        break;
      case 'DTEND':
        event.dtend = value;
        break;
      case 'RRULE':
        event.rrule = value;
        break;
      case 'STATUS':
        event.status = value;
        break;
    }
  }
  
  if (event.uid && event.summary && event.dtstart) {
    return {
      ...event,
      etag: etag || undefined
    } as CalDAVEvent;
  }
  
  return null;
}

function unescapeICalValue(value: string): string {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(/\\;/g, ';')
    .replace(/\\,/g, ',')
    .replace(/\\\\/g, '\\');
}

async function processAppleEvent(supabase: any, userId: string, event: CalDAVEvent) {
  try {
    // Convert CalDAV datetime to ISO string with timezone handling
    const startDate = parseCalDAVDate(event.dtstart);
    const endDate = parseCalDAVDate(event.dtend) || startDate;
    
    if (!startDate) {
      console.error(`Invalid start date for event ${event.uid}: ${event.dtstart}`);
      return;
    }

    // Check if event already exists with same ETag (no changes)
    const { data: existingEvent } = await supabase
      .from('calendar_events')
      .select('id, sync_etag')
      .eq('external_id', event.uid)
      .eq('provider', 'apple')
      .eq('user_id', userId)
      .single();

    if (existingEvent?.sync_etag === event.etag && event.etag) {
      console.log(`Event ${event.uid} unchanged, skipping`);
      return;
    }

    const eventData = {
      user_id: userId,
      title: event.summary || 'Untitled Event',
      description: event.description || '',
      starts_at: startDate,
      ends_at: endDate,
      location: event.location || '',
      all_day: isAllDayEvent(event.dtstart),
      external_id: event.uid,
      provider: 'apple',
      sync_status: 'synced',
      sync_etag: event.etag,
      last_synced: new Date().toISOString(),
    };

    // Upsert the event
    const { error } = await supabase
      .from('calendar_events')
      .upsert(eventData, { 
        onConflict: 'external_id,provider,user_id',
        ignoreDuplicates: false 
      });

    if (error) {
      console.error(`Failed to upsert event ${event.uid}:`, error);
    } else {
      console.log(`Processed event: ${event.summary}`);
    }
  } catch (error) {
    console.error(`Error processing event ${event.uid}:`, error);
  }
}

function isAllDayEvent(dtstart: string): boolean {
  // All-day events use DATE format (YYYYMMDD) without time
  return dtstart.length === 8 && !dtstart.includes('T');
}

function parseCalDAVDate(dateStr: string): string | null {
  try {
    // Clean the date string
    const cleanDate = dateStr.trim();
    
    if (cleanDate.length === 8) {
      // DATE format: YYYYMMDD (all-day event)
      const year = cleanDate.substring(0, 4);
      const month = cleanDate.substring(4, 6);
      const day = cleanDate.substring(6, 8);
      return `${year}-${month}-${day}T00:00:00.000Z`;
    } else if (cleanDate.includes('T')) {
      // DATETIME format: YYYYMMDDTHHMMSS[Z] or with timezone
      const isUtc = cleanDate.endsWith('Z');
      const hasTimezone = cleanDate.match(/[+-]\d{4}$/);
      
      let clean = cleanDate.replace(/[^\dT]/g, '');
      if (clean.length < 15) {
        // Pad with zeros if seconds are missing
        clean += '00'.substring(0, 15 - clean.length);
      }
      
      const year = clean.substring(0, 4);
      const month = clean.substring(4, 6);
      const day = clean.substring(6, 8);
      const hour = clean.substring(9, 11) || '00';
      const minute = clean.substring(11, 13) || '00';
      const second = clean.substring(13, 15) || '00';
      
      if (isUtc || !hasTimezone) {
        return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
      } else {
        // Handle timezone offset
        const tzMatch = cleanDate.match(/([+-])(\d{2})(\d{2})$/);
        if (tzMatch) {
          const [, sign, tzHour, tzMin] = tzMatch;
          return `${year}-${month}-${day}T${hour}:${minute}:${second}.000${sign}${tzHour}:${tzMin}`;
        }
        return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing CalDAV date:', dateStr, error);
    return null;
  }
}

function formatCalDAVDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function createICalEvent(event: CalendarEvent): string {
  const startDate = new Date(event.starts_at);
  const endDate = new Date(event.ends_at);
  const now = new Date();
  
  const formatDate = (date: Date, allDay = false) => {
    if (allDay) {
      return date.toISOString().split('T')[0].replace(/-/g, '');
    }
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const formatTimestamp = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const escapeICalValue = (value: string) => {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  };

  const dtstart = event.all_day 
    ? `DTSTART;VALUE=DATE:${formatDate(startDate, true)}`
    : `DTSTART:${formatDate(startDate)}`;
    
  const dtend = event.all_day 
    ? `DTEND;VALUE=DATE:${formatDate(endDate, true)}`
    : `DTEND:${formatDate(endDate)}`;

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//BuildBuddy Construction Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${event.id}@buildbuddy.app
DTSTAMP:${formatTimestamp(now)}
CREATED:${formatTimestamp(new Date(event.created_at || now))}
LAST-MODIFIED:${formatTimestamp(new Date(event.updated_at || now))}
${dtstart}
${dtend}
SUMMARY:${escapeICalValue(event.title || 'Untitled Event')}
DESCRIPTION:${escapeICalValue(event.description || '')}
LOCATION:${escapeICalValue(event.location || '')}
STATUS:CONFIRMED
TRANSP:OPAQUE
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;
}