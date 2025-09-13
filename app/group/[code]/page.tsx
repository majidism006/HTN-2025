"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGroup } from '@/hooks/useGroup';
import { useCalendars } from '@/hooks/useCalendars';
import { useSuggestions } from '@/hooks/useSuggestions';
import { SchedulingConstraints, Suggestion } from '@/lib/types';
import GroupHeader from '@/components/GroupHeader';
import MemberList from '@/components/MemberList';
import VoiceRecorder from '@/components/VoiceRecorder';
import SuggestionCard from '@/components/SuggestionCard';
import CalendarList from '@/components/CalendarList';
import GoogleConnect from '@/components/GoogleConnect';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function GroupPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const { groupId, userId, userName, groupCode, isInGroup, setGroup, clearGroup } = useGroup();
  const { calendars, loading: calendarsLoading, error: calendarsError, refetch: refetchCalendars } = useCalendars(groupId);
  const { suggestions, loading: suggestionsLoading, error: suggestionsError, getSuggestions } = useSuggestions();
  const { user: authUser } = useAuth();

  const [members, setMembers] = useState<Array<{ id: string; name: string; isIncluded: boolean }>>([]);
  const [isBooking, setIsBooking] = useState(false);
  const [joinName, setJoinName] = useState('');
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [banner, setBanner] = useState<string>('');

  // Prefill joinName from Auth profile
  useEffect(() => {
    if (!joinName && authUser?.name) setJoinName(authUser.name);
  }, [authUser, joinName]);

  // If not in group or different code, show join prompt inline
  const needsJoin = useMemo(() => {
    return !isInGroup || (groupCode && groupCode !== code);
  }, [isInGroup, groupCode, code]);

  // Update members view when calendars change
  useEffect(() => {
    if (calendars.length > 0) {
      const memberMap = new Map();
      calendars.forEach(cal => {
        if (!memberMap.has(cal.userId)) {
          memberMap.set(cal.userId, {
            id: cal.userId,
            name: cal.userName || 'Unknown',
            isIncluded: true,
          });
        }
      });
      setMembers(Array.from(memberMap.values()));
    }
  }, [calendars]);

  // SSE subscribe for live updates
  useEffect(() => {
    if (!groupId) return;
    const es = new EventSource(`/api/events/stream?groupId=${encodeURIComponent(groupId)}`);
    es.onmessage = () => refetchCalendars();
    es.onerror = () => es.close();
    return () => es.close();
  }, [groupId, refetchCalendars]);

  const handleJoin = async () => {
    if (!code || !joinName) {
      setJoinError('Please enter your name');
      return;
    }
    setIsJoining(true);
    setJoinError('');
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', groupCode: code, memberName: joinName }),
      });
      const data = await response.json();
      if (data.success) {
        setGroup(data.group.id, data.group.memberId, data.group.memberName, data.group.code);
        setBanner('Joined group successfully');
        setTimeout(() => setBanner(''), 3000);
      } else {
        setJoinError(data.error || 'Failed to join group');
      }
    } catch {
      setJoinError('Network error. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleParseComplete = async (constraints: SchedulingConstraints, summary: string, assumptions: string[]) => {
    if (!groupId) return;
    const includedMemberIds = members.filter(m => m.isIncluded).map(m => m.id);
    const suggs = await getSuggestions(groupId, constraints, includedMemberIds);
    if (suggs && suggs.length > 0) {
      // Auto-book the best suggestion (first one is already confidence-sorted)
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
          slot: { start: suggestion.start, end: suggestion.end },
          title: 'SynchroSched Meeting',
        }),
      });
      const data = await response.json();
      if (data.success) {
        await refetchCalendars();
        // Auto-download ICS for the booked event
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
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  if (needsJoin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-xl mx-auto p-6 py-12">
          <div className="card-gradient">
            <h1 className="text-2xl font-bold gradient-text mb-4">Join Group</h1>
            <p className="text-sm text-gray-600 mb-6">Enter your name to join group <span className="font-mono">{code}</span>.</p>
            <div className="flex items-center gap-2 mb-4">
              <button
                className="btn-secondary"
                onClick={() => {
                  const to = `/group/${code}`;
                  window.location.href = `/api/auth/login?returnTo=${encodeURIComponent(to)}`;
                }}
              >
                Login
              </button>
              <button
                className="bg-white/80 border border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white"
                onClick={() => {
                  const to = `/group/${code}`;
                  window.location.href = `/api/auth/login?returnTo=${encodeURIComponent(to)}&screen_hint=signup`;
                }}
              >
                Sign up
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                placeholder="Your Name"
                className="input-field"
              />
              {joinError && (
                <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl border border-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <span>{joinError}</span>
                </div>
              )}
              <button onClick={handleJoin} disabled={isJoining || !joinName} className="btn-primary w-full">
                {isJoining ? <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Joining…</> : 'Join Group'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div>
        <GroupHeader
          groupCode={groupCode!}
          groupName="SynchroSched Group"
          memberCount={members.length}
          onLeaveGroup={() => { clearGroup(); router.push('/'); }}
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
            <div className="space-y-8">
              <MemberList
                members={members}
                onToggleMember={(memberId) => setMembers(prev => prev.map(m => m.id === memberId ? { ...m, isIncluded: !m.isIncluded } : m))}
                currentUserId={userId!}
              />
              {userId && <GoogleConnect userId={userId} />}
              <VoiceRecorder onParseComplete={handleParseComplete} onError={(e) => alert(e)} />
            </div>
            <div className="lg:col-span-2 space-y-8">
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
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4"></div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Ready to schedule?</h4>
                    <p className="text-gray-600">Use voice input to describe your meeting and get instant suggestions!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {suggestions.map((suggestion) => (
                      <div key={suggestion.id} className="transform transition-all duration-300 hover:scale-105">
                        <SuggestionCard suggestion={suggestion} onBook={handleBookSlot} isBooking={isBooking} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <CalendarList calendars={calendars} members={members} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
