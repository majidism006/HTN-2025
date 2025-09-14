'use client';

import { useState } from 'react';
import { Calendar, Clock, MapPin, User } from 'lucide-react';
import { Calendar as CalendarType, Event } from '@/lib/types';
import { formatDateTime, formatTime } from '@/lib/time';

// Helper function to get day of week from date
function getDayOfWeek(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

// Helper function to get date from ISO string
function getDateFromISO(isoString: string): Date {
  return new Date(isoString);
}

// Helper function to check if date is today
function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

// Helper function to format date for display
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
}

interface CalendarListProps {
  calendars: CalendarType[];
  members: Array<{ id: string; name: string }>;
}

export default function CalendarList({ calendars, members }: CalendarListProps) {
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  const getMemberName = (userId: string) => {
    return members.find(m => m.id === userId)?.name || 'Unknown';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'exam':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'study':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'workout':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'social':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredCalendars = selectedMember 
    ? calendars.filter(cal => cal.userId === selectedMember)
    : calendars;

  // Organize events by day of the week
  const organizeEventsByDay = (events: Event[]) => {
    const eventsByDay: { [key: string]: Event[] } = {};
    
    events.forEach(event => {
      const eventDate = getDateFromISO(event.start);
      const dayKey = `${getDayOfWeek(eventDate)}-${formatDate(eventDate)}`;
      
      if (!eventsByDay[dayKey]) {
        eventsByDay[dayKey] = [];
      }
      eventsByDay[dayKey].push(event);
    });

    // Sort events within each day by time
    Object.keys(eventsByDay).forEach(dayKey => {
      eventsByDay[dayKey].sort((a, b) => 
        new Date(a.start).getTime() - new Date(b.start).getTime()
      );
    });

    return eventsByDay;
  };

  // Get all 7 days of the week (Sunday to Saturday)
  const getAllDays = () => {
    const days = [];
    
    // Start from Sunday, September 14th, 2025
    const startDate = new Date(2025, 8, 14); // Month is 0-indexed, so 8 = September
    
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(startDate);
      currentDay.setDate(startDate.getDate() + i);
      const dayName = getDayOfWeek(currentDay);
      const dayDate = formatDate(currentDay);
      days.push(`${dayName}-${dayDate}`);
    }
    
    return days;
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold gradient-text">Team Calendars</h3>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">Filter:</span>
          </div>
          <select
            value={selectedMember || ''}
            onChange={(e) => setSelectedMember(e.target.value || null)}
            className="px-4 py-2 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
          >
            <option value="">All Members</option>
            {members.map(member => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Horizontal Weekly Calendar View */}
      <div className="bg-gradient-to-r from-white/60 to-blue-50/60 backdrop-blur-sm rounded-xl border border-white/30 p-6">
        {/* Week Header */}
        <div className="grid grid-cols-8 gap-4 mb-6">
          <div className="text-center">
            <h4 className="font-bold text-gray-900 text-lg">Team Members</h4>
          </div>
        {getAllDays().map(dayKey => {
          const [dayName, dayDate] = dayKey.split('-');
          // Parse the date correctly for September 2025
          const dayDateObj = new Date(dayDate + ' 2025');
          const isCurrentDay = isToday(dayDateObj);
            
            return (
              <div key={dayKey} className={`text-center p-3 rounded-xl ${isCurrentDay ? 'bg-blue-100 border-2 border-blue-300' : 'bg-white/50'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mx-auto mb-2 ${isCurrentDay ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                  {dayDateObj.getDate()}
                </div>
                <h5 className={`font-bold text-sm ${isCurrentDay ? 'text-blue-900' : 'text-gray-900'}`}>
                  {dayName}
                </h5>
                <p className={`text-xs ${isCurrentDay ? 'text-blue-700' : 'text-gray-600'}`}>
                  {formatDate(dayDateObj)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Team Members Calendar Grid */}
        <div className="space-y-4">
          {filteredCalendars.map(calendar => {
            const memberName = getMemberName(calendar.userId);
            const eventsByDay = organizeEventsByDay(calendar.events);
            
            return (
              <div key={calendar.userId} className="grid grid-cols-8 gap-4 items-start">
                {/* Member Info */}
                <div className="flex items-center space-x-3 p-3 bg-white/70 rounded-xl">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center font-bold text-white shadow-lg">
                    {memberName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900">{memberName}</h5>
                    <p className="text-xs text-gray-500">{calendar.events.length} events</p>
                  </div>
                </div>

                {/* Daily Events */}
                {getAllDays().map(dayKey => {
                  const dayEvents = eventsByDay[dayKey] || [];
                  
                  return (
                    <div key={dayKey} className="min-h-[120px] p-2 bg-white/50 rounded-xl border border-white/30">
                      {dayEvents.length === 0 ? (
                        <div className="text-center py-4">
                          <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                            <Calendar className="h-3 w-3 text-gray-400" />
                          </div>
                          <p className="text-xs text-gray-400">Free</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {dayEvents.map(event => (
                            <div
                              key={event.id}
                              className={`p-2 rounded-lg text-xs border-l-2 ${getPriorityColor(event.priority)} hover:shadow-sm transition-all duration-200`}
                            >
                              <div className="font-semibold text-gray-900 truncate">
                                {event.title}
                              </div>
                              <div className="text-gray-600">
                                {formatTime(new Date(event.start))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-white/30">
          <div className="flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-100 border border-orange-200 rounded"></div>
              <span className="text-gray-600">High Priority</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
              <span className="text-gray-600">Medium Priority</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
              <span className="text-gray-600">Low Priority</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
