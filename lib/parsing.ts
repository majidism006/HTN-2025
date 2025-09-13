import { ParsedRequest, SchedulingConstraints, TimeConstraint } from './types';

// Duration parsing patterns
const DURATION_PATTERNS = [
  { pattern: /(\d+)\s*hours?/i, multiplier: 60 },
  { pattern: /(\d+)\s*hrs?/i, multiplier: 60 },
  { pattern: /(\d+)\s*minutes?/i, multiplier: 1 },
  { pattern: /(\d+)\s*mins?/i, multiplier: 1 },
  { pattern: /(\d+)\s*h/gi, multiplier: 60 },
  { pattern: /(\d+)\s*m/gi, multiplier: 1 },
];

// Time parsing patterns
const TIME_PATTERNS = [
  { pattern: /after\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?/i, type: 'after' },
  { pattern: /before\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?/i, type: 'before' },
  { pattern: /at\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?/i, type: 'at' },
  { pattern: /(\d{1,2}):?(\d{2})?\s*(am|pm)?/i, type: 'at' },
];

// Day parsing patterns
const DAY_PATTERNS = [
  { pattern: /tomorrow/i, day: 'tomorrow' },
  { pattern: /today/i, day: 'today' },
  { pattern: /this\s+week/i, day: 'this_week' },
  { pattern: /next\s+week/i, day: 'next_week' },
  { pattern: /monday|mon/i, day: 'monday' },
  { pattern: /tuesday|tue/i, day: 'tuesday' },
  { pattern: /wednesday|wed/i, day: 'wednesday' },
  { pattern: /thursday|thu/i, day: 'thursday' },
  { pattern: /friday|fri/i, day: 'friday' },
  { pattern: /saturday|sat/i, day: 'saturday' },
  { pattern: /sunday|sun/i, day: 'sunday' },
];

// Time window patterns
const WINDOW_PATTERNS = [
  { pattern: /morning/i, window: 'morning' },
  { pattern: /afternoon/i, window: 'afternoon' },
  { pattern: /evening/i, window: 'evening' },
  { pattern: /night/i, window: 'night' },
];

// Participant patterns
const PARTICIPANT_PATTERNS = [
  { pattern: /with\s+([^,]+(?:,\s*[^,]+)*)/i, type: 'with' },
  { pattern: /including\s+([^,]+(?:,\s*[^,]+)*)/i, type: 'including' },
];

// Location patterns
const LOCATION_PATTERNS = [
  { pattern: /at\s+([^,]+)/i, type: 'at' },
  { pattern: /in\s+([^,]+)/i, type: 'in' },
];

// Priority patterns
const PRIORITY_PATTERNS = [
  { pattern: /exam/i, priority: 'exam' },
  { pattern: /study/i, priority: 'study' },
  { pattern: /workout|gym/i, priority: 'workout' },
  { pattern: /social/i, priority: 'social' },
];

// Parse duration from text
function parseDuration(text: string): number | null {
  for (const { pattern, multiplier } of DURATION_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return parseInt(match[1]) * multiplier;
    }
  }
  return null;
}

// Parse time constraints from text
function parseTimeConstraints(text: string): TimeConstraint {
  const constraints: TimeConstraint = {};
  
  // Parse relative days
  for (const { pattern, day } of DAY_PATTERNS) {
    if (pattern.test(text)) {
      constraints.relativeDay = day as 'today' | 'tomorrow' | 'this_week' | 'next_week';
      break;
    }
  }
  
  // Parse time windows
  for (const { pattern, window } of WINDOW_PATTERNS) {
    if (pattern.test(text)) {
      constraints.timeWindow = window as 'morning' | 'afternoon' | 'evening' | 'night';
      break;
    }
  }
  
  // Parse specific times
  for (const { pattern, type } of TIME_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = match[2] ? parseInt(match[2]) : 0;
      const ampm = match[3]?.toLowerCase();
      
      // Convert to 24-hour format
      if (ampm === 'pm' && hours !== 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
      
      const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      if (type === 'after') {
        constraints.startTime = timeStr;
      } else if (type === 'before') {
        constraints.endTime = timeStr;
      } else if (type === 'at') {
        constraints.startTime = timeStr;
        constraints.endTime = timeStr;
      }
      break;
    }
  }
  
  return constraints;
}

// Parse participants from text
function parseParticipants(text: string): string[] {
  for (const { pattern, type } of PARTICIPANT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return match[1].split(',').map(name => name.trim());
    }
  }
  return [];
}

// Parse location from text
function parseLocation(text: string): string | null {
  for (const { pattern, type } of LOCATION_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return null;
}

// Parse priority from text
function parsePriority(text: string): string | null {
  for (const { pattern, priority } of PRIORITY_PATTERNS) {
    if (pattern.test(text)) {
      return priority;
    }
  }
  return null;
}

// Main parsing function
export function parseRequest(transcript: string): ParsedRequest {
  const assumptions: string[] = [];
  const normalizedSummary: string[] = [];
  
  // Parse duration
  const duration = parseDuration(transcript);
  if (!duration) {
    assumptions.push("No duration specified, defaulting to 1 hour");
    normalizedSummary.push("1 hour");
  } else {
    normalizedSummary.push(`${Math.floor(duration / 60)}h ${duration % 60}m`);
  }
  
  // Parse time constraints
  const timeConstraints = parseTimeConstraints(transcript);
  if (timeConstraints.relativeDay) {
    normalizedSummary.push(timeConstraints.relativeDay);
  }
  if (timeConstraints.timeWindow) {
    normalizedSummary.push(`in the ${timeConstraints.timeWindow}`);
  }
  if (timeConstraints.startTime) {
    normalizedSummary.push(`after ${timeConstraints.startTime}`);
  }
  if (timeConstraints.endTime) {
    normalizedSummary.push(`before ${timeConstraints.endTime}`);
  }
  
  // Parse participants
  const participants = parseParticipants(transcript);
  if (participants.length > 0) {
    normalizedSummary.push(`with ${participants.join(', ')}`);
  }
  
  // Parse location
  const location = parseLocation(transcript);
  if (location) {
    normalizedSummary.push(`at ${location}`);
  }
  
  // Parse priority
  const priority = parsePriority(transcript);
  if (priority) {
    normalizedSummary.push(`(${priority} priority)`);
  }
  
  const constraints: SchedulingConstraints = {
    duration: duration || 60, // Default to 1 hour
    participants: participants,
    location: location || undefined,
    priority: priority || undefined,
    timeConstraints,
  };
  
  return {
    constraints,
    normalizedSummary: normalizedSummary.join(' '),
    assumptions,
  };
}

// Future Groq integration
export async function parseWithGroq(transcript: string): Promise<ParsedRequest> {
  // This would integrate with Groq API for more sophisticated parsing
  // For now, fall back to regex parsing
  return parseRequest(transcript);
}
