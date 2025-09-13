import { format, addDays, startOfDay, endOfDay, addWeeks, isWithinInterval, parseISO } from 'date-fns';
import { TimeConstraint } from './types';

// Convert time string to minutes since midnight
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Convert minutes since midnight to time string
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Parse relative day references
export function parseRelativeDay(day: string, now: Date = new Date()): Date {
  const lower = day.toLowerCase();
  
  switch (lower) {
    case 'today':
      return now;
    case 'tomorrow':
      return addDays(now, 1);
    case 'this week':
      return now; // Default to today for this week
    case 'next week':
      return addWeeks(now, 1);
    default:
      return now;
  }
}

// Parse time window references
export function parseTimeWindow(window: string): { start: number; end: number } {
  const lower = window.toLowerCase();
  
  switch (lower) {
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

// Check if a time falls within a time window
export function isTimeInWindow(timeStr: string, window: { start: number; end: number }): boolean {
  const minutes = timeToMinutes(timeStr);
  return minutes >= window.start && minutes <= window.end;
}

// Get date range for scheduling
export function getDateRange(constraint: TimeConstraint, now: Date = new Date()): { start: Date; end: Date } {
  if (constraint.specificDate) {
    const date = parseISO(constraint.specificDate);
    return { start: startOfDay(date), end: endOfDay(date) };
  }
  
  if (constraint.relativeDay) {
    const date = parseRelativeDay(constraint.relativeDay, now);
    return { start: startOfDay(date), end: endOfDay(date) };
  }
  
  // Default to today
  return { start: startOfDay(now), end: endOfDay(now) };
}

// Format time for display
export function formatTime(date: Date): string {
  return format(date, 'h:mm a');
}

// Format date for display
export function formatDate(date: Date): string {
  return format(date, 'MMM d, yyyy');
}

// Format date and time for display
export function formatDateTime(date: Date): string {
  return format(date, 'MMM d, h:mm a');
}
