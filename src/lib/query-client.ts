'use client';

import { QueryClient } from '@tanstack/react-query';

let client: QueryClient | null = null;

export function getQueryClient(): QueryClient {
  if (!client) {
    client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,          // 30 s before background refetch
          gcTime: 5 * 60 * 1000,      // 5 min in cache after unmount
          refetchOnWindowFocus: true,
          retry: 1,
        },
        mutations: {
          retry: 0,                   // Never auto-retry mutations
        },
      },
    });
  }
  return client;
}
