import { NextRequest, NextResponse } from 'next/server';
import { CUACalendarAgent, CalendarApp, CUAConfig, BookingResult } from '@/lib/cua-calendar-agent';
import { OSType } from '@trycua/computer';

export interface CUABookingRequest {
  groupId: string;
  query: string;
  calendarApp?: {
    name: 'google' | 'outlook' | 'apple' | 'teams';
    url?: string;
  };
  cuaConfig?: {
    apiKey?: string;
    containerName?: string;
    osType?: 'linux' | 'macos' | 'windows';
  };
  autoConfirm?: boolean;
}

/**
 * POST /api/cua-book
 * Automated calendar booking using CUA AI
 */
export async function POST(request: NextRequest) {
  try {
    const body: CUABookingRequest = await request.json();
    
    // Validate required fields
    if (!body.groupId || !body.query) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Group ID and query are required' 
        },
        { status: 400 }
      );
    }

    // Configure CUA agent
    const cuaConfig: CUAConfig = {};
    
    if (body.cuaConfig) {
      cuaConfig.apiKey = body.cuaConfig.apiKey;
      cuaConfig.containerName = body.cuaConfig.containerName;
      
      // Map string OS type to enum
      if (body.cuaConfig.osType) {
        switch (body.cuaConfig.osType) {
          case 'linux':
            cuaConfig.osType = OSType.LINUX;
            break;
          case 'macos':
            cuaConfig.osType = OSType.MACOS;
            break;
          case 'windows':
            cuaConfig.osType = OSType.WINDOWS;
            break;
          default:
            cuaConfig.osType = OSType.LINUX;
        }
      }
    }

    // Configure calendar app
    const calendarApp: CalendarApp = {
      name: body.calendarApp?.name || 'google',
      url: body.calendarApp?.url || getDefaultCalendarUrl(body.calendarApp?.name || 'google'),
    };

    console.log(`Starting CUA automated booking for group ${body.groupId}`);
    console.log(`Query: "${body.query}"`);
    console.log(`Calendar app: ${calendarApp.name}`);

    // Create and run the CUA agent
    const agent = new CUACalendarAgent(cuaConfig);
    
    let result: BookingResult;
    
    try {
      result = await agent.automatedBookingWorkflow(
        body.groupId,
        body.query,
        calendarApp,
        {
          autoConfirm: body.autoConfirm || false,
        }
      );
    } catch (error) {
      console.error('CUA agent error:', error);
      result = {
        success: false,
        visualInteraction: false,
        error: error instanceof Error ? error.message : 'Unknown CUA agent error',
      };
    } finally {
      // Cleanup agent resources
      await agent.cleanup();
    }

    // Return results
    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? 'Calendar booking completed successfully' 
        : 'Calendar booking failed',
      data: {
        suggestions: result.suggestions,
        bookedSlot: result.bookedSlot,
        visualInteractionCompleted: result.visualInteraction,
        calendarApp: calendarApp.name,
        autoConfirmed: body.autoConfirm || false,
      },
      error: result.error,
    });

  } catch (error) {
    console.error('CUA booking API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during CUA booking',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cua-book
 * Get information about CUA booking capabilities
 */
export async function GET() {
  return NextResponse.json({
    description: 'CUA Calendar Booking Automation API',
    capabilities: [
      'Automated calendar booking using visual AI',
      'Support for Google Calendar, Outlook, Apple Calendar, Teams',
      'Integration with SynchroSched scheduling suggestions',
      'Visual interface interaction via CUA AI',
    ],
    supportedCalendarApps: ['google', 'outlook', 'apple', 'teams'],
    supportedOSTypes: ['linux', 'macos', 'windows'],
    usage: {
      endpoint: 'POST /api/cua-book',
      requiredFields: ['groupId', 'query'],
      optionalFields: ['calendarApp', 'cuaConfig', 'autoConfirm'],
      example: {
        groupId: 'group-123',
        query: 'Schedule a 1-hour team meeting for tomorrow afternoon',
        calendarApp: {
          name: 'google',
          url: 'https://calendar.google.com',
        },
        cuaConfig: {
          apiKey: 'your-cua-api-key',
          containerName: 'your-container-name',
          osType: 'linux',
        },
        autoConfirm: false,
      },
    },
  });
}

// Helper function to get default calendar URLs
function getDefaultCalendarUrl(appName: string): string {
  const urls = {
    google: 'https://calendar.google.com',
    outlook: 'https://outlook.live.com/calendar',
    apple: 'https://www.icloud.com/calendar',
    teams: 'https://teams.microsoft.com',
  };
  
  return urls[appName as keyof typeof urls] || urls.google;
}