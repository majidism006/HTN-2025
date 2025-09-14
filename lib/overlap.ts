import { Event, Calendar, SchedulingConstraints, Suggestion } from './types';
import { addMinutes, isWithinInterval, parseISO, format } from 'date-fns';
import { getDateRange, timeToMinutes, minutesToTime } from './time';

// Merge busy intervals from multiple calendars
function mergeBusyIntervals(calendars: Calendar[]): Event[] {
  const allEvents: Event[] = [];
  
  for (const calendar of calendars) {
    allEvents.push(...calendar.events.filter(event => event.isBusy));
  }
  
  // Sort by start time
  allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  
  // Merge overlapping intervals
  const merged: Event[] = [];
  
  for (const event of allEvents) {
    if (merged.length === 0) {
      merged.push(event);
      continue;
    }
    
    const lastMerged = merged[merged.length - 1];
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    const lastEnd = new Date(lastMerged.end);
    
    // If events overlap or are adjacent, merge them
    if (eventStart <= lastEnd) {
      lastMerged.end = eventEnd > lastEnd ? event.end : lastMerged.end;
    } else {
      merged.push(event);
    }
  }
  
  return merged;
}

// Find free slots within a time range
function findFreeSlots(
  busyIntervals: Event[],
  startTime: Date,
  endTime: Date,
  minDuration: number
): { start: Date; end: Date }[] {
  const freeSlots: { start: Date; end: Date }[] = [];
  
  // Filter busy intervals to the time range
  const relevantBusy = busyIntervals.filter(event => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    return eventStart < endTime && eventEnd > startTime;
  });
  
  // Sort by start time
  relevantBusy.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  
  // Start looking for slots at 9 AM if it's a business day
  let currentTime = new Date(startTime);
  const startHour = currentTime.getHours();
  
  // If we're starting before 9 AM, move to 9 AM
  if (startHour < 9) {
    currentTime.setHours(9, 0, 0, 0);
  }
  
  for (const busy of relevantBusy) {
    const busyStart = new Date(busy.start);
    const busyEnd = new Date(busy.end);
    
    // If there's a gap before this busy interval
    if (currentTime < busyStart) {
      const gapDuration = busyStart.getTime() - currentTime.getTime();
      const gapMinutes = gapDuration / (1000 * 60);
      
      if (gapMinutes >= minDuration) {
        freeSlots.push({
          start: currentTime,
          end: busyStart
        });
      }
    }
    
    // Move current time to after this busy interval
    currentTime = busyEnd > currentTime ? busyEnd : currentTime;
  }
  
  // Check for free time after the last busy interval, but not after 5 PM
  if (currentTime < endTime) {
    // Don't schedule meetings after 5 PM
    const endOfBusinessDay = new Date(currentTime);
    endOfBusinessDay.setHours(17, 0, 0, 0);
    
    const actualEndTime = endTime < endOfBusinessDay ? endTime : endOfBusinessDay;
    
    if (currentTime < actualEndTime) {
      const remainingDuration = actualEndTime.getTime() - currentTime.getTime();
      const remainingMinutes = remainingDuration / (1000 * 60);
      
      if (remainingMinutes >= minDuration) {
        freeSlots.push({
          start: currentTime,
          end: actualEndTime
        });
      }
    }
  }
  
  return freeSlots;
}

// Apply time constraints to free slots
function applyTimeConstraints(
  freeSlots: { start: Date; end: Date }[],
  constraints: SchedulingConstraints
): { start: Date; end: Date }[] {
  const { timeConstraints } = constraints;
  
  return freeSlots.filter(slot => {
    const slotStart = slot.start;
    const slotEnd = slot.end;
    
    // Check start time constraint
    if (timeConstraints.startTime) {
      const constraintTime = timeToMinutes(timeConstraints.startTime);
      const slotStartMinutes = slotStart.getHours() * 60 + slotStart.getMinutes();
      
      if (slotStartMinutes < constraintTime) {
        return false;
      }
    }
    
    // Check end time constraint
    if (timeConstraints.endTime) {
      const constraintTime = timeToMinutes(timeConstraints.endTime);
      const slotEndMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes();
      
      if (slotEndMinutes > constraintTime) {
        return false;
      }
    }
    
    // Check time window constraint
    if (timeConstraints.timeWindow) {
      const { start, end } = parseTimeWindow(timeConstraints.timeWindow);
      const slotStartMinutes = slotStart.getHours() * 60 + slotStart.getMinutes();
      const slotEndMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes();
      
      if (slotStartMinutes < start || slotEndMinutes > end) {
        return false;
      }
    }
    
    return true;
  });
}

// Parse time window (helper function)
function parseTimeWindow(window: string): { start: number; end: number } {
  switch (window) {
    case 'morning':
      return { start: timeToMinutes('06:00'), end: timeToMinutes('12:00') };
    case 'afternoon':
      return { start: timeToMinutes('12:00'), end: timeToMinutes('17:00') };
    case 'evening':
      return { start: timeToMinutes('17:00'), end: timeToMinutes('21:00') };
    case 'night':
      return { start: timeToMinutes('21:00'), end: timeToMinutes('23:59') };
    default:
      return { start: timeToMinutes('09:00'), end: timeToMinutes('21:00') };
  }
}

// Calculate confidence score for a suggestion
function calculateConfidence(
  slot: { start: Date; end: Date },
  constraints: SchedulingConstraints,
  availableMembers: string[]
): number {
  let confidence = 1.0;
  
  // Reduce confidence if time constraints are vague
  if (!constraints.timeConstraints.startTime && !constraints.timeConstraints.endTime) {
    confidence -= 0.1;
  }
  
  // Reduce confidence if no specific participants mentioned
  if (constraints.participants.length === 0) {
    confidence -= 0.1;
  }
  
  // Reduce confidence if slot is very early or very late
  const hour = slot.start.getHours();
  if (hour < 8 || hour > 20) {
    confidence -= 0.2;
  }
  
  return Math.max(0, Math.min(1, confidence));
}

// Main function to find common free slots
export function findCommonFreeSlots(
  calendars: Calendar[],
  constraints: SchedulingConstraints,
  maxSuggestions: number = 3
): Suggestion[] {
  const { duration, participants } = constraints;
  
  // Filter calendars to only included participants
  const relevantCalendars = calendars.filter(cal => 
    participants.length === 0 || participants.includes(cal.userId)
  );
  
  if (relevantCalendars.length === 0) {
    return [];
  }
  
  // Get date range for scheduling
  const { start: startTime, end: endTime } = getDateRange(constraints.timeConstraints);
  
  // Merge busy intervals from all calendars
  const busyIntervals = mergeBusyIntervals(relevantCalendars);
  
  // Find free slots
  let freeSlots = findFreeSlots(busyIntervals, startTime, endTime, duration);
  
  // Apply time constraints
  freeSlots = applyTimeConstraints(freeSlots, constraints);
  
  // Convert to suggestions
  const suggestions: Suggestion[] = freeSlots.slice(0, maxSuggestions).map((slot, index) => {
    const endTime = addMinutes(slot.start, duration);
    
    return {
      id: `suggestion-${index}`,
      start: slot.start.toISOString(),
      end: endTime.toISOString(),
      confidence: calculateConfidence(slot, constraints, participants),
      assumptions: generateAssumptions(constraints),
      normalizedSummary: generateNormalizedSummary(slot, constraints),
      availableMembers: participants.length > 0 ? participants : relevantCalendars.map(cal => cal.userId)
    };
  });
  
  // Sort by confidence (highest first)
  suggestions.sort((a, b) => b.confidence - a.confidence);
  
  return suggestions;
}

// Generate assumptions for a suggestion
function generateAssumptions(constraints: SchedulingConstraints): string[] {
  const assumptions: string[] = [];
  
  if (!constraints.timeConstraints.startTime && !constraints.timeConstraints.endTime) {
    assumptions.push("No specific time mentioned, using 9 AM - 9 PM window");
  }
  
  if (constraints.participants.length === 0) {
    assumptions.push("No specific participants mentioned, including all group members");
  }
  
  if (!constraints.location) {
    assumptions.push("No location specified");
  }
  
  return assumptions;
}

// Generate normalized summary for a suggestion
function generateNormalizedSummary(
  slot: { start: Date; end: Date },
  constraints: SchedulingConstraints
): string {
  const duration = constraints.duration;
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  
  let summary = `${hours}h ${minutes}m session`;
  
  if (constraints.participants.length > 0) {
    summary += ` with ${constraints.participants.join(', ')}`;
  }
  
  if (constraints.location) {
    summary += ` at ${constraints.location}`;
  }
  
  const day = format(slot.start, 'EEEE');
  const time = format(slot.start, 'h:mm a');
  summary += ` on ${day} at ${time}`;
  
  return summary;
}
