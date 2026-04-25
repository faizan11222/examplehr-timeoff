'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Balance } from '@/types';
import { useRequestStore } from '@/stores/requestStore';

export const balanceKeys = {
  all: (employeeId: string) => ['balances', employeeId] as const,
  single: (employeeId: string, locationId: string) =>
    ['balance', employeeId, locationId] as const,
};

/** Fetch all balances for an employee with background polling. */
export function useBalances(employeeId: string) {
  const { inFlight, addBanner } = useRequestStore();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: balanceKeys.all(employeeId),
    queryFn: async () => {
      const fresh = await api.getBalances(employeeId);

      // Reconciliation: diff against cached values
      const cached = queryClient.getQueryData<Balance[]>(balanceKeys.all(employeeId));
      if (cached) {
        for (const freshBalance of fresh) {
          const key = `${freshBalance.employeeId}::${freshBalance.locationId}`;
          const cachedBalance = cached.find(
            (c) => c.employeeId === freshBalance.employeeId && c.locationId === freshBalance.locationId,
          );

          if (cachedBalance && cachedBalance.available !== freshBalance.available) {
            if (inFlight.has(key)) {
              // Don't apply — mutation in-flight; queue a deferred banner
              // Banner will be added when mutation settles via onSettled
            } else {
              addBanner({
                employeeId: freshBalance.employeeId,
                locationId: freshBalance.locationId,
                previousAvailable: cachedBalance.available,
                newAvailable: freshBalance.available,
                reason: 'background-refresh',
              });
            }
          }
        }
      }

      // Keep individual cell caches in sync
      for (const b of fresh) {
        queryClient.setQueryData(balanceKeys.single(b.employeeId, b.locationId), b);
      }

      return fresh;
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

/** Real-time single-cell balance. Used by manager view for live data at decision time. */
export function useSingleBalance(employeeId: string, locationId: string) {
  return useQuery({
    queryKey: balanceKeys.single(employeeId, locationId),
    queryFn: () => api.getBalance(employeeId, locationId),
    staleTime: 0,            // always refetch — manager needs live data
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}
