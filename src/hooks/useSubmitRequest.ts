'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { api, HCMApiError } from '@/lib/api';
import { balanceKeys } from './useBalances';
import { requestKeys } from './useRequests';
import type { Balance, SubmitRequestPayload, TimeOffRequest } from '@/types';
import { useRequestStore } from '@/stores/requestStore';

export function useSubmitRequest(employeeId: string) {
  const queryClient = useQueryClient();
  const { registerInFlight, clearInFlight, addBanner } = useRequestStore();

  return useMutation({
    mutationFn: (payload: SubmitRequestPayload) => api.submitRequest(payload),

    onMutate: async (payload) => {
      const { locationId, days } = payload;
      const mutationId = uuidv4();

      // Cancel any outgoing refetches to avoid overwriting the optimistic update
      await queryClient.cancelQueries({ queryKey: balanceKeys.all(employeeId) });
      await queryClient.cancelQueries({
        queryKey: balanceKeys.single(employeeId, locationId),
      });

      // Snapshot for rollback
      const previousBalances = queryClient.getQueryData<Balance[]>(
        balanceKeys.all(employeeId),
      );
      const previousSingle = queryClient.getQueryData<Balance>(
        balanceKeys.single(employeeId, locationId),
      );

      // Optimistic update: decrement balance
      const applyDelta = (b: Balance): Balance =>
        b.employeeId === employeeId && b.locationId === locationId
          ? { ...b, available: b.available - days, pending: b.pending + days }
          : b;

      if (previousBalances) {
        queryClient.setQueryData(balanceKeys.all(employeeId), previousBalances.map(applyDelta));
      }
      if (previousSingle) {
        queryClient.setQueryData(balanceKeys.single(employeeId, locationId), applyDelta(previousSingle));
      }

      // Optimistic request entry
      const optimisticRequest: TimeOffRequest = {
        id: `optimistic-${mutationId}`,
        employeeId,
        locationId,
        days: payload.days,
        startDate: payload.startDate,
        endDate: payload.endDate,
        note: payload.note,
        status: 'optimistic-pending',
        submittedAt: new Date().toISOString(),
      };

      const previousRequests = queryClient.getQueryData<TimeOffRequest[]>(
        requestKeys.employee(employeeId),
      );
      queryClient.setQueryData(requestKeys.employee(employeeId), [
        ...(previousRequests ?? []),
        optimisticRequest,
      ]);

      // Register in-flight so reconciliation knows not to apply a background refresh
      registerInFlight({ mutationId, employeeId, locationId, optimisticDelta: -days });

      return { previousBalances, previousSingle, previousRequests, mutationId, optimisticRequest };
    },

    onError: (_err, payload, context) => {
      // Roll back optimistic update
      if (context?.previousBalances !== undefined) {
        queryClient.setQueryData(balanceKeys.all(employeeId), context.previousBalances);
      }
      if (context?.previousSingle !== undefined) {
        queryClient.setQueryData(
          balanceKeys.single(employeeId, payload.locationId),
          context.previousSingle,
        );
      }

      // Replace optimistic request with rolled-back entry
      const requests = queryClient.getQueryData<TimeOffRequest[]>(requestKeys.employee(employeeId));
      if (requests && context?.optimisticRequest) {
        queryClient.setQueryData(
          requestKeys.employee(employeeId),
          requests.map((r) =>
            r.id === context.optimisticRequest.id
              ? { ...r, status: 'rolled-back' as const }
              : r,
          ),
        );
      }
    },

    onSuccess: (data, payload, context) => {
      // Replace optimistic request with the real one from HCM
      const requests = queryClient.getQueryData<TimeOffRequest[]>(requestKeys.employee(employeeId));
      if (requests && context?.optimisticRequest) {
        queryClient.setQueryData(
          requestKeys.employee(employeeId),
          requests.map((r) =>
            r.id === context.optimisticRequest.id ? data : r,
          ),
        );
      }

      // Check for silent failure: HCM returned 200 but marked it
      const anyError = (data as unknown as { _silentFailure?: boolean })._silentFailure;
      if (anyError) {
        // Treat as rollback — the write wasn't committed
        if (context?.previousBalances !== undefined) {
          queryClient.setQueryData(balanceKeys.all(employeeId), context.previousBalances);
        }
        if (context?.previousSingle !== undefined) {
          queryClient.setQueryData(
            balanceKeys.single(employeeId, payload.locationId),
            context.previousSingle,
          );
        }
        if (requests && context?.optimisticRequest) {
          queryClient.setQueryData(
            requestKeys.employee(employeeId),
            requests.map((r) =>
              r.id === context.optimisticRequest.id
                ? { ...r, status: 'rolled-back' as const }
                : r,
            ),
          );
        }
      }
    },

    onSettled: (_data, _err, payload) => {
      clearInFlight(employeeId, payload.locationId);
      // Invalidate to get authoritative server state
      queryClient.invalidateQueries({ queryKey: balanceKeys.all(employeeId) });
      queryClient.invalidateQueries({
        queryKey: balanceKeys.single(employeeId, payload.locationId),
      });
      queryClient.invalidateQueries({ queryKey: requestKeys.employee(employeeId) });
    },
  });
}
