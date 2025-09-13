'use client';

import { useState } from 'react';
import { Calendar, Clock, Users, MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import { Suggestion } from '@/lib/types';
import { formatDateTime } from '@/lib/time';

interface SuggestionCardProps {
  suggestion: Suggestion;
  onBook: (suggestion: Suggestion) => void;
  isBooking?: boolean;
}

export default function SuggestionCard({ suggestion, onBook, isBooking = false }: SuggestionCardProps) {
  const [showAssumptions, setShowAssumptions] = useState(false);

  const confidenceColor = suggestion.confidence > 0.8 ? 'text-green-600' : 
                         suggestion.confidence > 0.6 ? 'text-yellow-600' : 'text-red-600';

  const confidenceText = suggestion.confidence > 0.8 ? 'High' : 
                        suggestion.confidence > 0.6 ? 'Medium' : 'Low';

  return (
    <div className="bg-gradient-to-br from-white/90 to-blue-50/50 backdrop-blur-sm rounded-2xl border border-white/30 p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <h4 className="text-xl font-bold text-gray-900 mb-3">
            {suggestion.normalizedSummary}
          </h4>
          
          <div className="flex items-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-4 w-4 text-blue-600" />
              </div>
              <span className="font-semibold">{formatDateTime(new Date(suggestion.start))}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Clock className="h-4 w-4 text-indigo-600" />
              </div>
              <span className="font-semibold">
                {Math.round((new Date(suggestion.end).getTime() - new Date(suggestion.start).getTime()) / (1000 * 60))} min
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="h-4 w-4 text-green-600" />
              </div>
              <span className="font-semibold">{suggestion.availableMembers.length} available</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-semibold ${
            suggestion.confidence > 0.8 
              ? 'bg-green-100 text-green-700' 
              : suggestion.confidence > 0.6 
              ? 'bg-yellow-100 text-yellow-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            <CheckCircle className="h-4 w-4" />
            <span>{confidenceText} Confidence</span>
          </div>
        </div>
      </div>

      {suggestion.assumptions.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowAssumptions(!showAssumptions)}
            className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 transition-colors font-semibold"
          >
            <AlertCircle className="h-4 w-4" />
            <span>
              {showAssumptions ? 'Hide' : 'Show'} Assumptions ({suggestion.assumptions.length})
            </span>
          </button>
          
          {showAssumptions && (
            <div className="mt-3 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl">
              <ul className="space-y-2 text-sm text-yellow-800">
                {suggestion.assumptions.map((assumption, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>{assumption}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 bg-white/60 px-3 py-2 rounded-lg border border-gray-200">
          <span className="font-semibold">Available members:</span> {suggestion.availableMembers.join(', ')}
        </div>
        
        <button
          onClick={() => onBook(suggestion)}
          disabled={isBooking}
          className="btn-primary flex items-center space-x-2 px-6 py-3"
        >
          {isBooking ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Booking...</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5" />
              <span>Book This Slot</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
