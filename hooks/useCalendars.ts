import { useState, useEffect } from 'react';
import { Calendar } from '@/lib/types';

interface UseCalendarsReturn {
  calendars: Calendar[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCalendars(groupId: string | null): UseCalendarsReturn {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendars = async () => {
    if (!groupId) {
      setCalendars([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/cal/${groupId}`);
      const data = await response.json();

      if (data.success) {
        setCalendars(data.calendars);
      } else {
        setError(data.error || 'Failed to fetch calendars');
      }
    } catch (err) {
      setError('Network error while fetching calendars');
      console.error('Error fetching calendars:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendars();
  }, [groupId]);

  return {
    calendars,
    loading,
    error,
    refetch: fetchCalendars,
  };
}
