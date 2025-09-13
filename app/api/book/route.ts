import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getGroup, saveGroup } from '@/lib/storage';
import { Event } from '@/lib/types';
import { hasGoogleAuth, insertEventForUser } from '@/lib/google-calendar';
import { recordEventToDynamo } from '@/lib/ddb';
import { emitBookingEvent } from '@/lib/event-bus';

export const runtime = 'nodejs';

// Book a time slot for group members
export async function POST(request: NextRequest) {
  try {
    const { groupId, userIds, slot, title } = await request.json();

    if (!groupId || !userIds || !slot) {
      return NextResponse.json(
        { success: false, error: 'Group ID, user IDs, and slot are required' },
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

    // Create the event
    const event: Event = {
      id: uuidv4(),
      title: title || 'SynchroSched Meeting',
      start: slot.start,
      end: slot.end,
      priority: 'medium',
      isBusy: true,
    };

    // Add event to all specified members' calendars, and create on Google Calendar when connected
    let updatedCount = 0;
    const gcalResults: Array<{ userId: string; ok: boolean; error?: string }> = [];
    for (const member of group.members) {
      if (!userIds.includes(member.id)) continue;
      // Persist in local calendar store
      member.calendar.events.push(event);
      updatedCount++;
      // Attempt Google Calendar creation if user connected
      try {
        const connected = await hasGoogleAuth(member.id);
        if (connected) {
          await insertEventForUser(member.id, {
            title: event.title,
            start: event.start,
            end: event.end,
          });
          gcalResults.push({ userId: member.id, ok: true });
        }
      } catch (e: any) {
        gcalResults.push({ userId: member.id, ok: false, error: e?.message || 'gcal failed' });
      }
    }

    if (updatedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid members found' },
        { status: 400 }
      );
    }

    // Update the group
    group.updatedAt = new Date().toISOString();
    await saveGroup(group);

    // Optionally record to DynamoDB to enable Streams integrations
    try {
      await recordEventToDynamo({ groupId, event: { id: event.id, title: event.title, start: event.start, end: event.end } });
    } catch {}

    // Emit SSE event to connected clients
    try {
      emitBookingEvent({
        groupId,
        event: { id: event.id, title: event.title, start: event.start, end: event.end },
        updatedMembers: updatedCount,
      });
    } catch {}

    return NextResponse.json({
      success: true,
      event,
      updatedMembers: updatedCount,
      gcal: gcalResults,
    });
  } catch (error) {
    console.error('Error booking slot:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
