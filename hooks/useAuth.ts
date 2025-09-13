"use client";

import { useEffect, useState } from 'react';

type AuthUser = {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
} | null;

export function useAuth() {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const enabled = process.env.NEXT_PUBLIC_AUTH0_ENABLED === 'true';

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setUser(null);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) throw new Error('not authed');
        const data = await res.json();
        if (!cancelled) setUser(data.user || data);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const login = (returnTo?: string) => {
    const to = returnTo || window.location.pathname + window.location.search;
    window.location.href = `/api/auth/login?returnTo=${encodeURIComponent(to)}`;
  };
  const logout = () => {
    const to = window.location.pathname + window.location.search;
    window.location.href = `/api/auth/logout?returnTo=${encodeURIComponent(to)}`;
  };

  return { user, loading, login, logout };
}
