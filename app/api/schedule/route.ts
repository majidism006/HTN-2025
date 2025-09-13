import { NextRequest, NextResponse } from 'next/server';
import { getGroup } from '@/lib/storage';
import { findCommonFreeSlots } from '@/lib/overlap';
import { Calendar, SchedulingConstraints } from '@/lib/types';
import { CUACalendarAgent, CalendarApp } from '@/lib/cua-calendar-agent';
import { OSType } from '@trycua/computer';

export const runtime = 'nodejs';

// Find scheduling suggestions for a group and optionally create calendar events with CUA
export async function POST(request: NextRequest) {
  try {
    const { 
      groupId, 
      userIds, 
      constraints, 
      query,
      autoSchedule = false,
      calendarApp = 'google',
      cuaConfig 
    } = await request.json();

    if (!groupId || !constraints) {
      return NextResponse.json(
        { success: false, error: 'Group ID and constraints are required' },
        { status: 400 }
      );
    }

    const group = await getGroup(groupId);
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    // Filter members based on userIds if provided
    let relevantMembers = group.members;
    if (userIds && userIds.length > 0) {
      relevantMembers = group.members.filter(member => 
        userIds.includes(member.id) && member.isIncluded
      );
    } else {
      relevantMembers = group.members.filter(member => member.isIncluded);
    }

    // Convert to calendar format
    const calendars: Calendar[] = relevantMembers.map(member => member.calendar);

    // Map participants (names → userIds). If none matched, include all relevant members
    const normalizedConstraints: SchedulingConstraints = (() => {
      const c = constraints as SchedulingConstraints;
      if (!c || !Array.isArray(c.participants)) return c;
      // Flatten tokens like "John and Sarah at the library" into ["John","Sarah"]
      const tokens: string[] = [];
      for (const raw of c.participants) {
        if (!raw) continue;
        const beforeAt = String(raw).split(/\sat\s/i)[0];
        const parts = beforeAt.split(/\band\b|,/i).map(s => s.trim()).filter(Boolean);
        tokens.push(...parts);
      }
      const byName = new Map(relevantMembers.map(m => [m.name.toLowerCase(), m.id]));
      const matchedIds = new Set<string>();
      for (const t of tokens) {
        const id = byName.get(t.toLowerCase());
        if (id) matchedIds.add(id);
      }
      const next: SchedulingConstraints = { ...c, participants: Array.from(matchedIds) } as SchedulingConstraints;
      // If nothing matched, clear participants so all included members are considered
      if (next.participants.length === 0) {
        next.participants = [];
      }
      return next;
    })();

    // Find free slots
    const suggestions = findCommonFreeSlots(calendars, normalizedConstraints, 3);

    let cuaResult = null;
    
    // If autoSchedule is enabled and we have suggestions, use CUA to create calendar events
    if (autoSchedule && suggestions.length > 0) {
      try {
        console.log('🤖 Starting CUA automated calendar booking...');
        
        // Configure CUA agent
        const agent = new CUACalendarAgent({
          apiKey: cuaConfig?.apiKey,
          containerName: cuaConfig?.containerName,
          osType: cuaConfig?.osType === 'macos' ? OSType.MACOS : 
                  cuaConfig?.osType === 'windows' ? OSType.WINDOWS : OSType.LINUX,
        });

        // Configure calendar app
        const calendarAppConfig: CalendarApp = {
          name: calendarApp as any,
          url: getCalendarUrl(calendarApp),
        };

        // Get the best suggestion
        const bestSuggestion = suggestions.reduce((best, current) => 
          current.confidence > best.confidence ? current : best
        );

        // Use CUA to create the calendar event
        cuaResult = await agent.automatedBookingWorkflow(
          groupId,
          query || `Meeting with ${relevantMembers.length} participants`,
          calendarAppConfig,
          { autoConfirm: true }
        );

        console.log('🤖 CUA booking result:', cuaResult);
        
        await agent.cleanup();
      } catch (cuaError) {
        console.error('❌ CUA booking failed:', cuaError);
        cuaResult = {
          success: false,
          error: cuaError instanceof Error ? cuaError.message : 'CUA booking failed',
          visualInteraction: false,
        };
      }
    }

    return NextResponse.json({
      success: true,
      suggestions,
      cuaBooking: cuaResult,
      autoScheduled: autoSchedule && cuaResult?.success,
      message: autoSchedule 
        ? cuaResult?.success 
          ? '✅ Calendar event created automatically via CUA!'
          : '⚠️ Suggestions found but CUA booking failed'
        : '📅 Scheduling suggestions found',
    });
  } catch (error) {
    console.error('Error finding suggestions:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to get calendar URLs
function getCalendarUrl(appName: string): string {
  const urls = {
    google: 'https://calendar.google.com',
    outlook: 'https://outlook.live.com/calendar',
    apple: 'https://www.icloud.com/calendar',
    teams: 'https://teams.microsoft.com/calendar',
  };
  
  return urls[appName as keyof typeof urls] || urls.google;
}
