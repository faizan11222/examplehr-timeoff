'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const requestKeys = {
  employee: (employeeId: string) => ['requests', 'employee', employeeId] as const,
  pending: () => ['requests', 'pending'] as const,
  all: () => ['requests', 'all'] as const,
};

/** Employee: get own requests */
export function useEmployeeRequests(employeeId: string) {
  return useQuery({
    queryKey: requestKeys.employee(employeeId),
    queryFn: () => api.getRequests({ employeeId }),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

/** Manager: get all pending requests */
export function usePendingRequests() {
  return useQuery({
    queryKey: requestKeys.pending(),
    queryFn: () => api.getRequests({ status: 'pending' }),
    refetchInterval: 15_000,   // manager view polls faster — decisions are time-sensitive
    refetchOnWindowFocus: true,
  });
}
