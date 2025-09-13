import { useState } from 'react';
import { SchedulingConstraints, Suggestion } from '@/lib/types';

interface UseSuggestionsReturn {
  suggestions: Suggestion[];
  loading: boolean;
  error: string | null;
  getSuggestions: (groupId: string, constraints: SchedulingConstraints, userIds?: string[]) => Promise<void>;
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

      const data = await response.json();

      if (data.success) {
        setSuggestions(data.suggestions);
      } else {
        setError(data.error || 'Failed to get suggestions');
      }
    } catch (err) {
      setError('Network error while getting suggestions');
      console.error('Error getting suggestions:', err);
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
