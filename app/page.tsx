'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGroup } from '@/hooks/useGroup';
import { useCalendars } from '@/hooks/useCalendars';
import { useSuggestions } from '@/hooks/useSuggestions';
import { SchedulingConstraints, Suggestion } from '@/lib/types';
import GroupHeader from '@/components/GroupHeader';
import MemberList from '@/components/MemberList';
import VoiceRecorder from '@/components/VoiceRecorder';
import SuggestionCard from '@/components/SuggestionCard';
import CalendarList from '@/components/CalendarList';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import GoogleConnect from '@/components/GoogleConnect';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const { groupId, userId, userName, groupCode, isInGroup, setGroup, clearGroup } = useGroup();
  const { calendars, loading: calendarsLoading, error: calendarsError, refetch: refetchCalendars } = useCalendars(groupId);
  const { suggestions, loading: suggestionsLoading, error: suggestionsError, getSuggestions } = useSuggestions();
  
  const [members, setMembers] = useState<Array<{ id: string; name: string; isIncluded: boolean }>>([]);
  const [isBooking, setIsBooking] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [banner, setBanner] = useState<string>('');
  const { user: authUser, loading: authLoading } = useAuth();

  const router = useRouter();

  // Check for group code in URL; redirect to canonical /group/[code]
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const groupCodeParam = urlParams.get('g');
    const googleConnected = urlParams.get('google');
    
    if (groupCodeParam && !isInGroup) {
      router.replace(`/group/${groupCodeParam}`);
      return;
    }

    if (googleConnected === 'connected') {
      setBanner('Google Calendar connected. Events will be created automatically for you.');
      urlParams.delete('google');
      const newUrl = `${window.location.pathname}?${urlParams.toString()}`.replace(/\?$/, '');
      window.history.replaceState({}, '', newUrl);
      setTimeout(() => setBanner(''), 4000);
    }
  }, [isInGroup]);

  // Prefill join name from Auth0 profile
  useEffect(() => {
    if (!joinName && authUser?.name) {
      setJoinName(authUser.name);
    }
  }, [authUser, joinName]);

  // Subscribe to SSE for live updates and refetch calendars
  useEffect(() => {
    if (!groupId) return;
    const es = new EventSource(`/api/events/stream?groupId=${encodeURIComponent(groupId)}`);
    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data?.type === 'booking' && data?.groupId === groupId) {
          refetchCalendars();
        }
      } catch {}
    };
    es.onerror = () => {
      es.close();
    };
    return () => es.close();
  }, [groupId, refetchCalendars]);

  // Update members when calendars change
  useEffect(() => {
    if (calendars.length > 0) {
      const memberMap = new Map();
      calendars.forEach(cal => {
        if (!memberMap.has(cal.userId)) {
          memberMap.set(cal.userId, {
            id: cal.userId,
            name: cal.userName || 'Unknown',
            isIncluded: true
          });
        }
      });
      setMembers(Array.from(memberMap.values()));
    }
  }, [calendars]);

  const handleCreateGroup = async (groupName: string, creatorName: string) => {
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', groupName, memberName: creatorName }),
      });

      const data = await response.json();
      
      if (data.success) {
        const memberId = data.group.memberId || 'creator';
        const memberName = data.group.memberName || creatorName || 'Creator';
        setGroup(data.group.id, memberId, memberName, data.group.code);
        setShowJoinForm(false);
        router.push(`/group/${data.group.code}`);
      } else {
        setJoinError(data.error || 'Failed to create group');
      }
    } catch (error) {
      setJoinError('Network error. Please try again.');
    }
  };

  const handleJoinGroup = async () => {
    if (!joinCode || !joinName) {
      setJoinError('Please enter both group code and your name');
      return;
    }

    setIsJoining(true);
    setJoinError('');

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'join', 
          groupCode: joinCode, 
          memberName: joinName 
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setGroup(data.group.id, data.group.memberId, data.group.memberName, data.group.code);
        setShowJoinForm(false);
        router.push(`/group/${data.group.code}`);
        setJoinCode('');
        setJoinName('');
      } else {
        setJoinError(data.error || 'Failed to join group');
      }
    } catch (error) {
      setJoinError('Network error. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleToggleMember = (memberId: string) => {
    setMembers(prev => 
      prev.map(member => 
        member.id === memberId 
          ? { ...member, isIncluded: !member.isIncluded }
          : member
      )
    );
  };

  const handleParseComplete = async (constraints: SchedulingConstraints, summary: string, assumptions: string[]) => {
    if (!groupId) return;
    const includedMemberIds = members.filter(m => m.isIncluded).map(m => m.id);
    const suggs = await getSuggestions(groupId, constraints, includedMemberIds);
    if (suggs && suggs.length > 0) {
      // Auto-book first suggestion
      await handleBookSlot(suggs[0]);
    } else {
      alert('No suggestions found for the given constraints.');
    }
  };

  const handleBookSlot = async (suggestion: Suggestion) => {
    if (!groupId) return;

    setIsBooking(true);
    
    try {
      const response = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          userIds: suggestion.availableMembers,
          slot: {
            start: suggestion.start,
            end: suggestion.end,
          },
          title: 'SynchroSched Meeting',
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Refresh calendars
        await refetchCalendars();
        // Auto-download ICS
        try {
          const res = await fetch('/api/ics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: data.event?.title || 'SynchroSched Meeting',
              start: data.event?.start || suggestion.start,
              end: data.event?.end || suggestion.end,
              description: 'Auto-scheduled via SynchroSched',
            }),
          });
          if (res.ok) {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'event.ics';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
          }
        } catch {}
        alert('Meeting booked successfully!');
      } else {
        alert('Failed to book meeting: ' + data.error);
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  const handleLeaveGroup = () => {
    clearGroup();
    setMembers([]);
  };

  // Show join form if not in group or if there's a group code in URL
  if (!isInGroup || showJoinForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">

        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-md">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl mb-6 shadow-2xl animate-bounce-slow">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-5xl font-black gradient-text mb-4 tracking-tight">
                SynchroSched
              </h1>
              <p className="text-xl text-gray-600 font-medium">
                Smart group scheduling with voice input
              </p>
              <div className="flex items-center justify-center space-x-4 mt-6 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Voice AI</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>Real-time</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  <span>Smart</span>
                </div>
              </div>
            </div>

            {/* Join or Create Group */}
            <div className="card-gradient">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-800">Join or Create a Group</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const to = window.location.pathname + window.location.search;
                        window.location.href = `/api/auth/login?returnTo=${encodeURIComponent(to)}`;
                      }}
                      className="btn-secondary text-sm"
                    >
                      Login
                    </button>
                    <button
                      onClick={() => {
                        const to = window.location.pathname + window.location.search;
                        window.location.href = `/api/auth/login?returnTo=${encodeURIComponent(to)}&screen_hint=signup`;
                      }}
                      className="bg-white/80 border border-gray-200 rounded-xl px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-white"
                    >
                      Sign up
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="groupCode" className="block text-sm font-semibold text-gray-700 mb-3">
                    Group Code
                  </label>
                  <input
                    id="groupCode"
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Enter 6-character code"
                    className="input-field text-center text-lg font-mono tracking-widest"
                    maxLength={6}
                  />
                </div>

                <div>
                  <label htmlFor="memberName" className="block text-sm font-semibold text-gray-700 mb-3">
                    Your Name
                  </label>
                  <input
                    id="memberName"
                    type="text"
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    placeholder="Enter your name"
                    className="input-field"
                  />
                  {authUser?.name && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => setJoinName(authUser.name || '')}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Use my Auth0 name ({authUser.name})
                      </button>
                    </div>
                  )}
                </div>

                {joinError && (
                  <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl border border-red-200">
                    <AlertCircle className="h-4 w-4" />
                    <span>{joinError}</span>
                  </div>
                )}

                <div className="space-y-4">
                  <button
                    onClick={handleJoinGroup}
                    disabled={isJoining || !joinCode || !joinName}
                    className="btn-primary w-full"
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        <span>Joining...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>Join Group</span>
                      </>
                    )}
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white/80 text-gray-500 font-medium">or</span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="newGroupName" className="block text-sm font-semibold text-gray-700 mb-3">
                      New Group Name
                    </label>
                    <input
                      id="newGroupName"
                      type="text"
                      placeholder="e.g., Study Buddies"
                      className="input-field"
                      onChange={(e) => (e.target as any)._val = e.target.value}
                    />
                  </div>
                  <button
                    onClick={() => {
                      const input = document.getElementById('newGroupName') as HTMLInputElement | null;
                      const gname = input?.value?.trim() || 'New Group';
                      if (!joinName) {
                        setJoinError('Please enter your name to create a group');
                        return;
                      }
                      handleCreateGroup(gname, joinName);
                    }}
                    className="btn-secondary w-full"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Create New Group</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="mt-12 grid grid-cols-1 gap-4">
              <div className="flex items-center space-x-3 text-gray-600">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <span className="font-medium">Voice-powered scheduling</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-600">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="font-medium">Lightning-fast AI processing</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-600">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <span className="font-medium">Real-time collaboration</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div>
        <GroupHeader
          groupCode={groupCode!}
          groupName="SynchroSched Group"
          memberCount={members.length}
          onLeaveGroup={handleLeaveGroup}
        />

        {banner && (
          <div className="max-w-7xl mx-auto px-6 mt-4">
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">{banner}</span>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Members and Voice Input */}
            <div className="space-y-8">
              <MemberList
                members={members}
                onToggleMember={handleToggleMember}
                currentUserId={userId!}
              />

              {userId && (
                <GoogleConnect userId={userId} />
              )}

              <VoiceRecorder
                onParseComplete={handleParseComplete}
                onError={(error) => alert(error)}
              />
            </div>

            {/* Right Column - Suggestions and Calendars */}
            <div className="lg:col-span-2 space-y-8">
              {/* Suggestions */}
              <div className="card-gradient">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold gradient-text">Smart Suggestions</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>AI Powered</span>
                  </div>
                </div>
                
                {suggestionsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                    </div>
                    <p className="mt-4 text-gray-600 font-medium">Finding the perfect time...</p>
                  </div>
                ) : suggestionsError ? (
                  <div className="flex items-center justify-center space-x-3 text-red-600 py-12 bg-red-50 rounded-xl border border-red-200">
                    <AlertCircle className="h-6 w-6" />
                    <span className="font-medium">{suggestionsError}</span>
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Ready to schedule?</h4>
                    <p className="text-gray-600">Use voice input to describe your meeting and get instant suggestions!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {suggestions.map((suggestion, index) => (
                      <div key={suggestion.id} className="transform transition-all duration-300 hover:scale-105">
                        <SuggestionCard
                          suggestion={suggestion}
                          onBook={handleBookSlot}
                          isBooking={isBooking}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Calendars */}
              <CalendarList
                calendars={calendars}
                members={members}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
