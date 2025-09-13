import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getGroup, saveGroup } from '@/lib/storage';
import { Event } from '@/lib/types';

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

    // Add event to all specified members' calendars
    let updatedCount = 0;
    for (const member of group.members) {
      if (userIds.includes(member.id)) {
        member.calendar.events.push(event);
        updatedCount++;
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

    return NextResponse.json({
      success: true,
      event,
      updatedMembers: updatedCount,
    });
  } catch (error) {
    console.error('Error booking slot:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
