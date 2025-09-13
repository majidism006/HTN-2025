import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { Group, Member } from '@/lib/types';
import { saveGroup, getGroupByCode } from '@/lib/storage';

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
      const groupId = uuidv4();
      const code = generateGroupCode();
      
      // Ensure code is unique
      let uniqueCode = code;
      while (await getGroupByCode(uniqueCode)) {
        uniqueCode = generateGroupCode();
      }

      const group: Group = {
        id: groupId,
        code: uniqueCode,
        name: groupName || 'New Group',
        members: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // If creator name is provided, create initial member for the group
      let creatorMemberId: string | null = null;
      if (memberName && typeof memberName === 'string' && memberName.trim().length > 0) {
        const creatorId = uuidv4();
        creatorMemberId = creatorId;
        group.members.push({
          id: creatorId,
          name: memberName.trim(),
          isIncluded: true,
          calendar: {
            userId: creatorId,
            events: [],
          },
        });
      }

      await saveGroup(group);

      return NextResponse.json({
        success: true,
        group: {
          id: group.id,
          code: group.code,
          name: group.name,
          memberId: creatorMemberId,
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
          events: [
            // Seed with some sample busy events
            {
              id: uuidv4(),
              title: 'Sample Meeting',
              start: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
              end: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours from now
              priority: 'medium',
              isBusy: true,
            },
            {
              id: uuidv4(),
              title: 'Lunch Break',
              start: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(), // 5 hours from now
              end: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
              priority: 'low',
              isBusy: true,
            },
          ],
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
