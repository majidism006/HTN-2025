'use client';

import { useState } from 'react';
import { User, CheckCircle, Circle } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  isIncluded: boolean;
}

interface MemberListProps {
  members: Member[];
  onToggleMember: (memberId: string) => void;
  currentUserId: string;
}

export default function MemberList({ members, onToggleMember, currentUserId }: MemberListProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold gradient-text">Team Members</h3>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span>Active</span>
        </div>
      </div>
      
      <div className="space-y-3">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-4 bg-gradient-to-r from-white/60 to-blue-50/60 backdrop-blur-sm rounded-xl border border-white/30 hover:shadow-lg transition-all duration-300 transform hover:scale-105"
          >
            <div className="flex items-center space-x-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-lg ${
                member.id === currentUserId 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600' 
                  : 'bg-gradient-to-r from-gray-400 to-gray-500'
              }`}>
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="text-gray-900 font-semibold text-lg">
                  {member.name}
                  {member.id === currentUserId && (
                    <span className="ml-2 text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">You</span>
                  )}
                </span>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Online</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => onToggleMember(member.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
                member.isIncluded
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg hover:shadow-xl'
                  : 'bg-white/60 text-gray-600 hover:bg-white/80 border border-gray-200'
              }`}
            >
              {member.isIncluded ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Included</span>
                </>
              ) : (
                <>
                  <Circle className="h-4 w-4" />
                  <span>Excluded</span>
                </>
              )}
            </button>
          </div>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-700">Scheduling Status</span>
          </div>
          <span className="text-lg font-bold gradient-text">
            {members.filter(m => m.isIncluded).length} / {members.length}
          </span>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {members.filter(m => m.isIncluded).length} of {members.length} members included in scheduling
        </p>
      </div>
    </div>
  );
}
