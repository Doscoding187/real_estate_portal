import { useEffect, useState } from 'react';

const PROSPECT_SESSION_KEY = 'prospect_session';

function createProspectSessionId() {
  return `prospect_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function getOrCreateProspectSessionId() {
  if (typeof window === 'undefined') return '';

  const existing = window.localStorage.getItem(PROSPECT_SESSION_KEY);
  if (existing) return existing;

  const next = createProspectSessionId();
  window.localStorage.setItem(PROSPECT_SESSION_KEY, next);
  return next;
}

export function useProspectSessionId() {
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    setSessionId(getOrCreateProspectSessionId());
  }, []);

  return sessionId;
}
