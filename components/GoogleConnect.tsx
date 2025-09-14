"use client";

import { useEffect, useState } from 'react';

type Props = {
  userId: string;
};

export default function GoogleConnect({ userId }: Props) {
  const [connected, setConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch(`/api/google/status?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      setConnected(!!data.connected);
      setError('');
    } catch (e) {
      setConnected(false);
      setError('Failed to check Google status');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [userId]);

  const connect = () => {
    const redirect = window.location.pathname + window.location.search;
    window.location.href = `/api/google/auth/initiate?userId=${encodeURIComponent(userId)}&redirect=${encodeURIComponent(redirect)}`;
  };

  const disconnect = async () => {
    setLoading(true);
    try {
      await fetch(`/api/google/status?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
      setConnected(false);
      setError('');
    } catch (e) {
      setError('Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-gradient" role="region" aria-label="Google Calendar connection">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-lg font-bold">Google Calendar</h4>
          <p className="text-sm text-gray-600">Connect to auto-create events on your calendar</p>
        </div>
        <div>
          {connected ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-4 py-2 rounded-xl bg-green-100 text-green-700 border border-green-200 font-semibold">Connected</span>
              <button onClick={disconnect} disabled={loading} className="btn-ghost">Disconnect</button>
            </div>
          ) : (
            <button onClick={connect} disabled={loading} className="btn-secondary" aria-label="Connect Google Calendar">
              {loading ? 'Checking…' : 'Connect'}
            </button>
          )}
        </div>
      </div>
      {error && (
        <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</div>
      )}
    </div>
  );
}
