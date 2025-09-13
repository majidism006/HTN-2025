import { useState } from 'react';
import { SchedulingConstraints, Suggestion } from '@/lib/types';

interface UseSuggestionsReturn {
  suggestions: Suggestion[];
  loading: boolean;
  error: string | null;
  getSuggestions: (groupId: string, constraints: SchedulingConstraints, userIds?: string[]) => Promise<Suggestion[]>;
}

export function useSuggestions(): UseSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSuggestions = async (
    groupId: string,
    constraints: SchedulingConstraints,
    userIds?: string[]
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupId,
          userIds,
          constraints,
        }),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        setError(text || 'Failed to get suggestions');
        return [];
      }
      const data = await response.json().catch(() => ({}));
      if (data?.success) setSuggestions(data.suggestions || []);
      else setError(data?.error || 'Failed to get suggestions');
      return (data?.suggestions || []) as Suggestion[];
    } catch (err) {
      setError('Network error while getting suggestions');
      console.error('Error getting suggestions:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    suggestions,
    loading,
    error,
    getSuggestions,
  };
}
