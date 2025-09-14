import { Group, Member, Event } from './types';

// Test data for demonstrating CUA scheduling functionality
export const createTestGroup = (): Group => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Create some test events for members
  const testEvents: Event[] = [
    {
      id: 'event-1',
      title: 'Morning Standup',
      start: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 9, 0).toISOString(),
      end: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 9, 30).toISOString(),
      priority: 'high',
      isBusy: true,
    },
    {
      id: 'event-2',
      title: 'Lunch Break',
      start: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 12, 0).toISOString(),
      end: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 13, 0).toISOString(),
      priority: 'medium',
      isBusy: true,
    },
  ];

  const members: Member[] = [
    {
      id: 'user-1',
      name: 'Alice Developer',
      isIncluded: true,
      calendar: {
        userId: 'user-1',
        userName: 'Alice Developer',
        events: [...testEvents],
      },
    },
    {
      id: 'user-2',
      name: 'Bob Manager',
      isIncluded: true,
      calendar: {
        userId: 'user-2',
        userName: 'Bob Manager',
        events: [testEvents[0]], // Only has morning standup
      },
    },
    {
      id: 'user-3',
      name: 'Carol Designer',
      isIncluded: true,
      calendar: {
        userId: 'user-3',
        userName: 'Carol Designer',
        events: [testEvents[1]], // Only has lunch break
      },
    },
  ];

  return {
    id: 'test-group-123',
    code: 'TEST123',
    name: 'Test Development Team',
    members,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
};

// Mock CUA booking result for testing
export const createMockCUAResult = (success: boolean = true) => {
  return {
    success,
    visualInteraction: true,
    bookedSlot: success ? {
      start: new Date(Date.now() + 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000).toISOString(), // Tomorrow 2 PM
      end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000).toISOString(), // Tomorrow 3 PM
    } : undefined,
    error: success ? undefined : 'Failed to connect to calendar application',
    suggestions: [
      {
        id: 'suggestion-1',
        start: new Date(Date.now() + 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000).toISOString(),
        end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000).toISOString(),
        confidence: 0.95,
        availableMembers: ['user-1', 'user-2', 'user-3'],
        assumptions: ['All members are available during afternoon hours'],
        normalizedSummary: 'Team meeting tomorrow afternoon',
      },
    ],
  };
};