import { NextRequest, NextResponse } from 'next/server';
import { createTestGroup, createMockCUAResult } from '@/lib/test-data';
import { findCommonFreeSlots } from '@/lib/overlap';
import { Calendar } from '@/lib/types';

/**
 * Test endpoint to demonstrate CUA scheduling functionality
 * This creates a test group with sample data and simulates the CUA booking process
 */
export async function POST(request: NextRequest) {
  try {
    const { simulateSuccess = true, enableCUA = true } = await request.json();

    console.log('🧪 Starting CUA scheduling test...');
    
    // Create test group with sample calendar data
    const testGroup = createTestGroup();
    console.log(`📋 Created test group "${testGroup.name}" with ${testGroup.members.length} members`);

    // Extract calendars for overlap calculation
    const calendars: Calendar[] = testGroup.members
      .filter(member => member.isIncluded)
      .map(member => member.calendar);

    // Define test constraints (60-minute meeting tomorrow afternoon)
    const constraints = {
      duration: 60,
      participants: testGroup.members.map(m => m.id),
      timeConstraints: {
        relativeDay: 'tomorrow' as const,
        timeWindow: 'afternoon' as const,
      },
    };

    console.log('🔍 Finding available time slots...');
    
    // Find common free slots
    const suggestions = findCommonFreeSlots(calendars, constraints, 3);
    console.log(`📅 Found ${suggestions.length} available time slots`);

    let cuaResult = null;
    let actuallyScheduled = false;

    // Simulate CUA booking if enabled
    if (enableCUA && suggestions.length > 0) {
      console.log('🤖 Simulating CUA calendar booking...');
      
      // In a real scenario, this would be the actual CUA agent
      cuaResult = createMockCUAResult(simulateSuccess);
      
      if (cuaResult.success) {
        console.log('✅ CUA booking simulation: SUCCESS');
        console.log(`📅 Event created: ${cuaResult.bookedSlot?.start} - ${cuaResult.bookedSlot?.end}`);
        actuallyScheduled = true;
        
        // In a real implementation, we would:
        // 1. Use the CUA agent to visually interact with the calendar app
        // 2. Create the actual calendar event
        // 3. Update the group members' calendars in our system
        
        // For demonstration, let's add the event to our test group members
        const newEvent = {
          id: 'cua-created-event',
          title: 'CUA Auto-Scheduled Meeting',
          start: cuaResult.bookedSlot!.start,
          end: cuaResult.bookedSlot!.end,
          priority: 'high' as const,
          isBusy: true,
        };

        // Add to all members' calendars
        testGroup.members.forEach(member => {
          if (cuaResult!.suggestions[0].availableMembers.includes(member.id)) {
            member.calendar.events.push(newEvent);
          }
        });
        
        console.log('📝 Added event to members\' calendars');
      } else {
        console.log('❌ CUA booking simulation: FAILED');
        console.log(`Error: ${cuaResult.error}`);
      }
    }

    // Prepare response with detailed information
    const response = {
      success: true,
      test: true,
      testGroup: {
        id: testGroup.id,
        name: testGroup.name,
        memberCount: testGroup.members.length,
        members: testGroup.members.map(m => ({
          id: m.id,
          name: m.name,
          eventCount: m.calendar.events.length,
        })),
      },
      scheduling: {
        suggestions,
        suggestionsFound: suggestions.length,
        bestSlot: suggestions.length > 0 ? {
          start: suggestions[0].start,
          end: suggestions[0].end,
          confidence: suggestions[0].confidence,
        } : null,
      },
      cuaBooking: cuaResult ? {
        enabled: enableCUA,
        success: cuaResult.success,
        visualInteraction: cuaResult.visualInteraction,
        bookedSlot: cuaResult.bookedSlot,
        error: cuaResult.error,
        actuallyScheduled,
      } : {
        enabled: false,
        message: 'CUA booking was disabled for this test',
      },
      verification: {
        message: actuallyScheduled 
          ? '✅ Calendar event was successfully created and added to members\' calendars'
          : enableCUA 
            ? '⚠️ CUA booking failed - no calendar event was created'
            : '📋 CUA booking was disabled - only suggestions were generated',
        steps: [
          '1. ✅ Created test group with sample calendar data',
          '2. ✅ Found common available time slots',
          enableCUA ? (actuallyScheduled ? '3. ✅ CUA agent successfully created calendar event' : '3. ❌ CUA agent failed to create calendar event') : '3. ⏭️ CUA booking skipped',
          actuallyScheduled ? '4. ✅ Updated group members\' calendars' : '4. ⏭️ Calendar update skipped',
        ],
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Test schedule error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Test schedule failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for test information
 */
export async function GET() {
  return NextResponse.json({
    description: 'CUA Calendar Scheduling Test Endpoint',
    purpose: 'Demonstrates and verifies CUA calendar booking functionality with test data',
    usage: {
      endpoint: 'POST /api/test-schedule',
      options: {
        simulateSuccess: 'boolean (default: true) - Whether to simulate successful CUA booking',
        enableCUA: 'boolean (default: true) - Whether to enable CUA booking simulation',
      },
      examples: [
        {
          description: 'Test successful CUA booking',
          payload: { simulateSuccess: true, enableCUA: true },
        },
        {
          description: 'Test failed CUA booking',
          payload: { simulateSuccess: false, enableCUA: true },
        },
        {
          description: 'Test without CUA (suggestions only)',
          payload: { enableCUA: false },
        },
      ],
    },
    testData: {
      groupName: 'Test Development Team',
      memberCount: 3,
      sampleEvents: 2,
      timeSlots: 'Tomorrow afternoon slots',
    },
  });
}