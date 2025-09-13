'use client';

import { useState } from 'react';
import { Calendar, Clock, MapPin, User } from 'lucide-react';
import { Calendar as CalendarType, Event } from '@/lib/types';
import { formatDateTime, formatTime } from '@/lib/time';

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

      <div className="space-y-6">
        {filteredCalendars.map(calendar => (
          <div key={calendar.userId} className="bg-gradient-to-r from-white/60 to-blue-50/60 backdrop-blur-sm rounded-xl border border-white/30 p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center font-bold text-white shadow-lg">
                {getMemberName(calendar.userId).charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-lg">{getMemberName(calendar.userId)}</h4>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Calendar className="h-4 w-4" />
                  <span>{calendar.events.length} events scheduled</span>
                </div>
              </div>
            </div>

            {calendar.events.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-gray-400" />
                </div>
                <h5 className="text-lg font-semibold text-gray-700 mb-2">No events scheduled</h5>
                <p className="text-gray-500">This member has a clear schedule</p>
              </div>
            ) : (
              <div className="space-y-3">
                {calendar.events
                  .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                  .map(event => (
                    <div
                      key={event.id}
                      className={`p-4 rounded-xl border-l-4 ${getPriorityColor(event.priority)} hover:shadow-md transition-all duration-200`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-bold text-gray-900 text-lg mb-2">{event.title}</h5>
                          <div className="flex items-center space-x-6 text-sm text-gray-600">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Clock className="h-3 w-3 text-blue-600" />
                              </div>
                              <span className="font-semibold">{formatTime(new Date(event.start))} - {formatTime(new Date(event.end))}</span>
                            </div>
                            {event.location && (
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
                                  <MapPin className="h-3 w-3 text-green-600" />
                                </div>
                                <span className="font-semibold">{event.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="text-xs font-semibold bg-white/70 border border-gray-200 rounded-full px-3 py-1 hover:bg-white/90"
                            onClick={async () => {
                              try {
                                const res = await fetch('/api/ics', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    title: event.title,
                                    start: event.start,
                                    end: event.end,
                                    description: `${getMemberName(calendar.userId)}'s event`,
                                    location: event.location,
                                  }),
                                });
                                if (!res.ok) return;
                                const blob = await res.blob();
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${event.title}.ics`;
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                                URL.revokeObjectURL(url);
                              } catch {}
                            }}
                          >
                            Download .ics
                          </button>
                          <div className="text-xs font-bold text-gray-600 bg-white/60 px-3 py-1 rounded-full capitalize">
                            {event.priority}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
