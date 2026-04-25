'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { balanceKeys } from './useBalances';
import { requestKeys } from './useRequests';
import type { DecideRequestPayload, TimeOffRequest } from '@/types';

interface DecideArgs extends DecideRequestPayload {
  id: string;
  employeeId: string;
  locationId: string;
}

/** Pessimistic: no optimistic update. Manager approves/denies against live data. */
export function useDecideRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, decision, decisionNote }: DecideArgs) =>
      api.decideRequest(id, { decision, decisionNote }),

    onSuccess: (updated, { employeeId, locationId }) => {
      // Update the request in all relevant caches
      const updateRequest = (reqs: TimeOffRequest[] | undefined) =>
        reqs?.map((r) => (r.id === updated.id ? updated : r));

      queryClient.setQueryData(requestKeys.pending(), updateRequest);
      queryClient.setQueryData(requestKeys.employee(employeeId), updateRequest);
    },

    onSettled: (_data, _err, { employeeId, locationId }) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.pending() });
      queryClient.invalidateQueries({ queryKey: requestKeys.employee(employeeId) });
      queryClient.invalidateQueries({ queryKey: balanceKeys.all(employeeId) });
      queryClient.invalidateQueries({
        queryKey: balanceKeys.single(employeeId, locationId),
      });
    },
  });
}
