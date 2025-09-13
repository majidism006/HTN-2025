'use client';

import { useState } from 'react';
import { Copy, Users, Share2 } from 'lucide-react';

interface GroupHeaderProps {
  groupCode: string;
  groupName: string;
  memberCount: number;
  onLeaveGroup: () => void;
}

export default function GroupHeader({ groupCode, groupName, memberCount, onLeaveGroup }: GroupHeaderProps) {
  const [copied, setCopied] = useState(false);

  const joinLink = `${window.location.origin}?g=${groupCode}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-md border-b border-white/20 px-6 py-6 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-black gradient-text">{groupName}</h1>
            <div className="flex items-center space-x-3 text-gray-600">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span className="font-semibold">{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm">Live</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/30">
            <span className="text-sm font-semibold text-gray-700">Code:</span>
            <code className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-mono text-lg font-bold tracking-wider shadow-lg">
              {groupCode}
            </code>
          </div>

          <button
            onClick={copyLink}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
              copied 
                ? 'bg-green-500 text-white shadow-lg' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
            }`}
          >
            <Copy className="h-4 w-4" />
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>

          <button
            onClick={onLeaveGroup}
            className="btn-ghost px-4 py-2 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Leave Group
          </button>
        </div>
      </div>
    </div>
  );
}
