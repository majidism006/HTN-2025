import { NextRequest, NextResponse } from 'next/server';
import { getGroup } from '@/lib/storage';

// Get calendars for a group
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const group = await getGroup(groupId);

    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    // Return calendars for all members
    const calendars = group.members.map(member => ({
      userId: member.id,
      userName: member.name,
      events: member.calendar.events,
    }));

    return NextResponse.json({
      success: true,
      calendars,
    });
  } catch (error) {
    console.error('Error fetching calendars:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
