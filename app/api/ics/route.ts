import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

function formatICSDate(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  const mm = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const mi = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

export async function POST(req: NextRequest) {
  try {
    const { title, start, end, description, location } = await req.json();
    if (!title || !start || !end) {
      return new Response('Missing title/start/end', { status: 400 });
    }
    const uid = `${Date.now()}@synchrosched.local`;
    const now = formatICSDate(new Date().toISOString());
    const dtstart = formatICSDate(start);
    const dtend = formatICSDate(end);
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SynchroSched//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${(title as string).replace(/\n/g, ' ')}`,
      description ? `DESCRIPTION:${(description as string).replace(/\n/g, ' ')}` : '',
      location ? `LOCATION:${(location as string).replace(/\n/g, ' ')}` : '',
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean);
    const body = lines.join('\r\n');
    return new Response(body, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="event.ics"`,
      },
    });
  } catch (e: any) {
    return new Response('Failed to generate ICS', { status: 500 });
  }
}

