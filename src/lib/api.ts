import type {
  Balance,
  DecideRequestPayload,
  HCMError,
  SubmitRequestPayload,
  TimeOffRequest,
} from '@/types';

export class HCMApiError extends Error {
  constructor(
    public status: number,
    public hcmError: HCMError,
  ) {
    super(hcmError.code);
  }
}

async function hcmFetch<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json();
  if (!res.ok) {
    throw new HCMApiError(res.status, json.error ?? { code: 'NOT_FOUND' });
  }
  if (json.error) {
    // Treat application-level errors (e.g. silent failure confirmation)
    throw new HCMApiError(200, json.error);
  }
  return json.data as T;
}

export const api = {
  /** Real-time single-cell balance read */
  getBalance(employeeId: string, locationId: string): Promise<Balance> {
    return hcmFetch(`/api/hcm/balance?employeeId=${employeeId}&locationId=${locationId}`);
  },

  /** Batch read all balances for an employee */
  getBalances(employeeId: string): Promise<Balance[]> {
    return hcmFetch(`/api/hcm/balances?employeeId=${employeeId}`);
  },

  /** Submit a new time-off request */
  submitRequest(payload: SubmitRequestPayload): Promise<TimeOffRequest> {
    return hcmFetch('/api/hcm/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  /** List requests, optionally filtered */
  getRequests(params: { employeeId?: string; status?: string }): Promise<TimeOffRequest[]> {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][],
    ).toString();
    return hcmFetch(`/api/hcm/requests${qs ? `?${qs}` : ''}`);
  },

  /** Manager: approve or deny a request */
  decideRequest(id: string, payload: DecideRequestPayload): Promise<TimeOffRequest> {
    return hcmFetch(`/api/hcm/requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  /** Test-harness trigger: fire anniversary bonus for an employee */
  triggerAnniversary(employeeId: string, bonusDays?: number): Promise<Balance[]> {
    return hcmFetch('/api/hcm/trigger/anniversary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, bonusDays }),
    });
  },
};
