'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { balanceKeys } from './useBalances';

/** Test-harness hook: trigger anniversary bonus for an employee. */
export function useAnniversaryTrigger(employeeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bonusDays?: number) => api.triggerAnniversary(employeeId, bonusDays),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: balanceKeys.all(employeeId) });
    },
  });
}
