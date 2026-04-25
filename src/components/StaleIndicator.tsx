'use client';

import { useEffect, useState } from 'react';

interface StaleIndicatorProps {
  asOf: string; // ISO timestamp
  staleAfterMs?: number;
}

export function StaleIndicator({ asOf, staleAfterMs = 5 * 60 * 1000 }: StaleIndicatorProps) {
  const [ageMs, setAgeMs] = useState(() => Date.now() - new Date(asOf).getTime());

  useEffect(() => {
    const id = setInterval(() => {
      setAgeMs(Date.now() - new Date(asOf).getTime());
    }, 10_000);
    return () => clearInterval(id);
  }, [asOf]);

  const isStale = ageMs > staleAfterMs;
  const minutes = Math.floor(ageMs / 60_000);

  if (!isStale) return null;

  return (
    <span
      title={`Balance as of ${new Date(asOf).toLocaleTimeString()}`}
      className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700"
    >
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
      {minutes}m ago
    </span>
  );
}
