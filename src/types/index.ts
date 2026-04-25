export interface BalanceKey {
  employeeId: string;
  locationId: string;
}

export interface Balance extends BalanceKey {
  available: number;
  pending: number;
  unit: 'days' | 'hours';
  asOf: string; // ISO timestamp from HCM
}

export type RequestStatus =
  | 'optimistic-pending'
  | 'pending'
  | 'approved'
  | 'denied'
  | 'rolled-back'
  | 'hcm-conflict';

export interface TimeOffRequest {
  id: string;
  employeeId: string;
  locationId: string;
  days: number;
  startDate: string;
  endDate: string;
  note?: string;
  status: RequestStatus;
  submittedAt: string;
  decidedAt?: string;
  decisionNote?: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  locationIds: string[];
}

export interface Location {
  id: string;
  name: string;
}

export interface SubmitRequestPayload {
  employeeId: string;
  locationId: string;
  days: number;
  startDate: string;
  endDate: string;
  note?: string;
}

export interface DecideRequestPayload {
  decision: 'approved' | 'denied';
  decisionNote?: string;
}

export type HCMError =
  | { code: 'INSUFFICIENT_BALANCE'; available: number; requested: number }
  | { code: 'INVALID_DIMENSION'; field: string }
  | { code: 'NOT_FOUND' }
  | { code: 'CONFLICT'; message: string };

export interface HCMResponse<T> {
  data?: T;
  error?: HCMError;
}
