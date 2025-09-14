'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CUABookingResult {
  success: boolean;
  message: string;
  data?: {
    suggestions: Array<{
      id: string;
      start: string;
      end: string;
      confidence: number;
      availableMembers: string[];
    }>;
    bookedSlot?: {
      start: string;
      end: string;
    };
    visualInteractionCompleted: boolean;
    calendarApp: string;
    autoConfirmed: boolean;
  };
  error?: string;
}

export default function CUABookingSimple() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CUABookingResult | null>(null);
  const [formData, setFormData] = useState({
    groupId: '',
    query: '',
    calendarApp: 'google',
    autoConfirm: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const payload = {
        groupId: formData.groupId,
        query: formData.query,
        calendarApp: {
          name: formData.calendarApp,
        },
        autoConfirm: formData.autoConfirm,
      };

      const response = await fetch('/api/cua-book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: 'Network error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          🤖 CUA Calendar Booking
        </h2>
        <p className="text-gray-600 mb-6">
          Automatically book calendar events using AI-powered visual interface interaction.
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
              Booking Query <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.query}
              onChange={(e) => setFormData(prev => ({ ...prev, query: e.target.value }))}
              placeholder="e.g., Schedule a 1-hour team meeting for tomorrow afternoon"
              required
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
              id="autoConfirm"
              checked={formData.autoConfirm}
              onChange={(e) => setFormData(prev => ({ ...prev, autoConfirm: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <label htmlFor="autoConfirm" className="text-sm font-medium">
              Auto-confirm booking
            </label>
          </div>

          <Button 
            type="submit" 
            disabled={isLoading || !formData.groupId || !formData.query}
            className="w-full"
          >
            {isLoading ? 'Processing CUA Booking...' : 'Start Automated Booking'}
          </Button>
        </form>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold mb-4">
            {result.success ? '✅ Success' : '❌ Failed'}
          </h3>
          
          <div className="space-y-4">
            <div className={`p-4 rounded ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className={result.success ? 'text-green-800' : 'text-red-800'}>
                {result.message}
              </p>
              {result.error && (
                <p className="text-red-600 text-sm mt-2">Error: {result.error}</p>
              )}
            </div>

            {result.data && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <span className={`px-2 py-1 rounded text-sm ${result.data.visualInteractionCompleted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    Visual Interaction: {result.data.visualInteractionCompleted ? 'Completed' : 'Partial'}
                  </span>
                  <span className="px-2 py-1 rounded text-sm bg-blue-100 text-blue-800">
                    Calendar: {result.data.calendarApp}
                  </span>
                  {result.data.autoConfirmed && (
                    <span className="px-2 py-1 rounded text-sm bg-purple-100 text-purple-800">
                      Auto-Confirmed
                    </span>
                  )}
                </div>

                {result.data.suggestions && result.data.suggestions.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Scheduling Suggestions:</h4>
                    <div className="space-y-2">
                      {result.data.suggestions.map((suggestion, index) => (
                        <div key={suggestion.id} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">
                                {new Date(suggestion.start).toLocaleString()} - {new Date(suggestion.end).toLocaleString()}
                              </p>
                              <p className="text-sm text-gray-600">
                                {suggestion.availableMembers.length} available members
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded text-sm ${index === 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {Math.round(suggestion.confidence * 100)}% confidence
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.data.bookedSlot && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">Successfully Booked:</h4>
                    <p className="text-green-700">
                      {new Date(result.data.bookedSlot.start).toLocaleString()} - {new Date(result.data.bookedSlot.end).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold mb-4">How It Works</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Enter your SynchroSched group ID and a natural language booking request</li>
          <li>Choose your preferred calendar application</li>
          <li>The CUA agent will:
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
              <li>Get scheduling suggestions from your SynchroSched group</li>
              <li>Navigate to your calendar application</li>
              <li>Use visual AI to interact with the calendar interface</li>
              <li>Create the calendar event automatically</li>
              <li>Optionally book the slot in your SynchroSched system</li>
            </ul>
          </li>
        </ol>
      </div>
    </div>
  );
}