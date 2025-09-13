'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ScheduleResult {
  success: boolean;
  suggestions: Array<{
    id: string;
    start: string;
    end: string;
    confidence: number;
    availableMembers: string[];
  }>;
  cuaBooking?: {
    success: boolean;
    visualInteraction: boolean;
    error?: string;
  };
  autoScheduled: boolean;
  message: string;
}

export default function EnhancedScheduleDemo() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [formData, setFormData] = useState({
    groupId: '',
    query: '',
    duration: 60,
    autoSchedule: true,
    calendarApp: 'google',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      // Create constraints from form data
      const constraints = {
        duration: formData.duration,
        participants: [], // Will use all included members
        timeConstraints: {
          relativeDay: 'tomorrow' as const,
          timeWindow: 'afternoon' as const,
        },
      };

      const payload = {
        groupId: formData.groupId,
        constraints,
        query: formData.query,
        autoSchedule: formData.autoSchedule,
        calendarApp: formData.calendarApp,
        // CUA config can be added here if needed
        cuaConfig: {
          osType: 'linux', // Default to Linux for development
        },
      };

      console.log('🚀 Sending schedule request:', payload);

      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('📅 Schedule response:', data);
      setResult(data);
    } catch (error) {
      console.error('❌ Schedule error:', error);
      setResult({
        success: false,
        suggestions: [],
        autoScheduled: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          🤖📅 Smart Scheduling with CUA Agent
        </h2>
        <p className="text-gray-600 mb-6">
          Find scheduling suggestions and automatically create calendar events using AI-powered visual interaction.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Group ID <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.groupId}
              onChange={(e) => setFormData(prev => ({ ...prev, groupId: e.target.value }))}
              placeholder="Enter your SynchroSched group ID"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Meeting Description
            </label>
            <Input
              value={formData.query}
              onChange={(e) => setFormData(prev => ({ ...prev, query: e.target.value }))}
              placeholder="e.g., Team standup meeting, Project review, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Duration (minutes)
            </label>
            <Input
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
              min="15"
              max="480"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Calendar Application</label>
            <select 
              value={formData.calendarApp} 
              onChange={(e) => setFormData(prev => ({ ...prev, calendarApp: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="google">Google Calendar</option>
              <option value="outlook">Outlook Calendar</option>
              <option value="apple">Apple Calendar</option>
              <option value="teams">Microsoft Teams</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoSchedule"
              checked={formData.autoSchedule}
              onChange={(e) => setFormData(prev => ({ ...prev, autoSchedule: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <label htmlFor="autoSchedule" className="text-sm font-medium">
              🤖 Auto-create calendar event with CUA Agent
            </label>
          </div>

          <Button 
            type="submit" 
            disabled={isLoading || !formData.groupId}
            className="w-full"
          >
            {isLoading ? 
              formData.autoSchedule ? 
                '🤖 Finding slots and creating calendar event...' : 
                '📅 Finding available slots...'
              : 
              formData.autoSchedule ? 
                '🤖 Smart Schedule + Auto-Create Event' : 
                '📅 Find Available Slots'
            }
          </Button>
        </form>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            {result.success ? '✅' : '❌'} Results
          </h3>
          
          <div className="space-y-4">
            {/* Status Message */}
            <div className={`p-4 rounded border ${
              result.success 
                ? result.autoScheduled 
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <p className="font-medium">{result.message}</p>
            </div>

            {/* CUA Booking Status */}
            {result.cuaBooking && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">🤖 CUA Agent Status:</h4>
                <div className="flex gap-2 mb-2">
                  <span className={`px-2 py-1 rounded text-sm ${
                    result.cuaBooking.success 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    Booking: {result.cuaBooking.success ? 'Success' : 'Failed'}
                  </span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    result.cuaBooking.visualInteraction 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    Visual UI: {result.cuaBooking.visualInteraction ? 'Completed' : 'Skipped'}
                  </span>
                </div>
                {result.cuaBooking.error && (
                  <p className="text-sm text-red-600">Error: {result.cuaBooking.error}</p>
                )}
              </div>
            )}

            {/* Suggestions */}
            {result.suggestions && result.suggestions.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">📅 Available Time Slots:</h4>
                <div className="space-y-2">
                  {result.suggestions.map((suggestion, index) => (
                    <div key={suggestion.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">
                            {new Date(suggestion.start).toLocaleString()} - {new Date(suggestion.end).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            {suggestion.availableMembers.length} members available
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <span className={`px-2 py-1 rounded text-sm ${
                            index === 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {Math.round(suggestion.confidence * 100)}% confidence
                          </span>
                          {index === 0 && result.autoScheduled && (
                            <span className="px-2 py-1 rounded text-sm bg-purple-100 text-purple-800">
                              🤖 Auto-Created
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold mb-4">🔬 How Smart Scheduling Works</h3>
        <div className="space-y-3 text-sm">
          <div className="flex gap-3">
            <span className="font-bold text-blue-600">1️⃣</span>
            <p><strong>Find Optimal Slots:</strong> Analyzes all group members' calendars to find common free time</p>
          </div>
          <div className="flex gap-3">
            <span className="font-bold text-green-600">2️⃣</span>
            <p><strong>CUA Agent Activation:</strong> If auto-schedule is enabled, launches AI agent to interact with calendar</p>
          </div>
          <div className="flex gap-3">
            <span className="font-bold text-purple-600">3️⃣</span>
            <p><strong>Visual Calendar Interaction:</strong> Agent navigates to your calendar app and creates the event automatically</p>
          </div>
          <div className="flex gap-3">
            <span className="font-bold text-orange-600">4️⃣</span>
            <p><strong>Confirmation:</strong> Returns results showing both the suggestions and calendar creation status</p>
          </div>
        </div>
      </div>
    </div>
  );
}