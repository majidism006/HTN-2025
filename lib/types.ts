export interface Event {
  id: string;
  title: string;
  start: string; // ISO string
  end: string; // ISO string
  location?: string;
  priority: 'low' | 'medium' | 'high' | 'exam' | 'study' | 'workout' | 'social';
  isBusy: boolean; // true for busy events, false for free time
}

export interface Calendar {
  userId: string;
  userName?: string;
  events: Event[];
}

export interface Member {
  id: string;
  name: string;
  isIncluded: boolean; // for scheduling
  calendar: Calendar;
}

export interface Group {
  id: string;
  code: string; // unique join code
  name: string;
  members: Member[];
  createdAt: string;
  updatedAt: string;
}

export interface TimeConstraint {
  duration?: number; // in minutes
  startTime?: string; // "15:00" format
  endTime?: string; // "21:00" format
  relativeDay?: 'today' | 'tomorrow' | 'this_week' | 'next_week';
  specificDate?: string; // ISO date string
  dayOfWeek?: number; // 0-6 (Sunday-Saturday)
  timeWindow?: 'morning' | 'afternoon' | 'evening' | 'night';
}

export interface SchedulingConstraints {
  duration: number; // in minutes
  participants: string[]; // member IDs
  location?: string;
  priority?: string;
  timeConstraints: TimeConstraint;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'biweekly';
    count: number;
    daysOfWeek?: number[]; // for weekly recurrence
  };
}

export interface Suggestion {
  id: string;
  start: string; // ISO string
  end: string; // ISO string
  confidence: number; // 0-1
  assumptions: string[];
  normalizedSummary: string;
  availableMembers: string[]; // member IDs who are free
}

export interface ParsedRequest {
  constraints: SchedulingConstraints;
  normalizedSummary: string;
  assumptions: string[];
}

export interface GroupStorage {
  [groupId: string]: Group;
}
