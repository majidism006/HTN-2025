import { NextRequest, NextResponse } from 'next/server';
import { getGroup } from '@/lib/storage';
import { findCommonFreeSlots } from '@/lib/overlap';
import { Calendar } from '@/lib/types';

// Find scheduling suggestions for a group
export async function POST(request: NextRequest) {
  try {
    const { groupId, userIds, constraints } = await request.json();

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

    // Find free slots
    const suggestions = findCommonFreeSlots(calendars, constraints, 3);

    return NextResponse.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    console.error('Error finding suggestions:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
