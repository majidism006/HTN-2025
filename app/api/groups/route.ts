import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { Group, Member } from '@/lib/types';
import { saveGroup, getGroupByCode } from '@/lib/storage';

// Generate realistic calendar events for a week
function generateWeekCalendar(userId: string, isBob: boolean = false): any[] {
  const events = [];
  
  // Set demo date to Sunday, September 14th, 2025
  const demoDate = new Date(2025, 8, 14); // Month is 0-indexed, so 8 = September
  const startOfWeek = new Date(demoDate);
  startOfWeek.setHours(9, 0, 0, 0); // Start at 9 AM

  // Generate lightly filled calendar for demo - Sunday to Saturday
  for (let day = 0; day < 7; day++) {
    const currentDay = new Date(startOfWeek);
    currentDay.setDate(startOfWeek.getDate() + day);
    
    // Add some events to most days but keep some empty for comparison
    if (day === 0) { // Sunday - mostly empty
      // Keep Sunday mostly free
    }
    
    if (day === 1) { // Monday - add overlapping team meeting
      events.push({
        id: uuidv4(),
        title: 'Team Sync Meeting',
        start: new Date(currentDay.getTime() + 4 * 60 * 60 * 1000).toISOString(),
        end: new Date(currentDay.getTime() + 5 * 60 * 60 * 1000).toISOString(),
        priority: 'high',
        isBusy: true,
      });
    }
    
    if (day === 2) { // Tuesday - add individual work
      events.push({
        id: uuidv4(),
        title: isBob ? 'Client Follow-up' : 'Development Work',
        start: new Date(currentDay.getTime() + 1 * 60 * 60 * 1000).toISOString(),
        end: new Date(currentDay.getTime() + 3 * 60 * 60 * 1000).toISOString(),
        priority: 'medium',
        isBusy: true,
      });
    }
    
    if (day === 3) { // Wednesday - add overlapping team meeting + individual event
      events.push({
        id: uuidv4(),
        title: 'Team Sync Meeting',
        start: new Date(currentDay.getTime() + 4 * 60 * 60 * 1000).toISOString(),
        end: new Date(currentDay.getTime() + 5 * 60 * 60 * 1000).toISOString(),
        priority: 'high',
        isBusy: true,
      });
      
      // Add individual event for Bob
      if (isBob) {
        events.push({
          id: uuidv4(),
          title: 'Client Meeting',
          start: new Date(currentDay.getTime() + 1 * 60 * 60 * 1000).toISOString(),
          end: new Date(currentDay.getTime() + 2 * 60 * 60 * 1000).toISOString(),
          priority: 'high',
          isBusy: true,
        });
      }
    }
    
    if (day === 4) { // Thursday - add some work
      events.push({
        id: uuidv4(),
        title: isBob ? 'Project Review' : 'Code Review',
        start: new Date(currentDay.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        end: new Date(currentDay.getTime() + 4 * 60 * 60 * 1000).toISOString(),
        priority: 'medium',
        isBusy: true,
      });
    }
    
    if (day === 5) { // Friday - add end of week meeting
      events.push({
        id: uuidv4(),
        title: 'Weekly Retrospective',
        start: new Date(currentDay.getTime() + 3 * 60 * 60 * 1000).toISOString(),
        end: new Date(currentDay.getTime() + 4 * 60 * 60 * 1000).toISOString(),
        priority: 'high',
        isBusy: true,
      });
    }
    
    if (day === 6) { // Saturday - mostly empty
      // Keep Saturday mostly free
    }
  }

  return events;
}

// Generate a unique 6-character code
function generateGroupCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Create a new group
export async function POST(request: NextRequest) {
  try {
    const { action, groupName, memberName, groupCode } = await request.json();

    if (action === 'create') {
      // Create new group
      if (!memberName || memberName.trim() === '') {
        return NextResponse.json(
          { success: false, error: 'Member name is required when creating a group' },
          { status: 400 }
        );
      }

      const groupId = uuidv4();
      const code = generateGroupCode();
      
      // Ensure code is unique
      let uniqueCode = code;
      while (await getGroupByCode(uniqueCode)) {
        uniqueCode = generateGroupCode();
      }

      // Create the creating user as the first member
      const creatorId = uuidv4();
      const creatorMember: Member = {
        id: creatorId,
        name: memberName,
        isIncluded: true,
        calendar: {
          userId: creatorId,
          events: generateWeekCalendar(creatorId, false),
        },
      };

      const group: Group = {
        id: groupId,
        code: uniqueCode,
        name: groupName || 'New Group',
        members: [creatorMember],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveGroup(group);

      return NextResponse.json({
        success: true,
        group: {
          id: group.id,
          code: group.code,
          name: group.name,
          memberId: creatorId,
          memberName: memberName || null,
          joinLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/group/${group.code}`,
        },
      });
    }

    if (action === 'join') {
      // Join existing group
      if (!groupCode || !memberName) {
        return NextResponse.json(
          { success: false, error: 'Group code and member name are required' },
          { status: 400 }
        );
      }

      const group = await getGroupByCode(groupCode);
      if (!group) {
        return NextResponse.json(
          { success: false, error: 'Group not found' },
          { status: 404 }
        );
      }

      // Check if member already exists
      const existingMember = group.members.find(m => m.name.toLowerCase() === memberName.toLowerCase());
      if (existingMember) {
        return NextResponse.json({
          success: true,
          group: {
            id: group.id,
            code: group.code,
            name: group.name,
            memberId: existingMember.id,
            memberName: existingMember.name,
          },
        });
      }

      // Add new member
      const memberId = uuidv4();
      const newMember: Member = {
        id: memberId,
        name: memberName,
        isIncluded: true,
        calendar: {
          userId: memberId,
          events: generateWeekCalendar(memberId, false),
        },
      };

      group.members.push(newMember);
      group.updatedAt = new Date().toISOString();

      await saveGroup(group);

      return NextResponse.json({
        success: true,
        group: {
          id: group.id,
          code: group.code,
          name: group.name,
          memberId: newMember.id,
          memberName: newMember.name,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in groups API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
