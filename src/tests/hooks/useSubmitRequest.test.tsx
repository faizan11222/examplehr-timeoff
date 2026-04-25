import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { resetMswStore } from '../mocks/handlers';
import { useSubmitRequest } from '@/hooks/useSubmitRequest';
import type { Balance } from '@/types';
import React from 'react';

function makeWrapper(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } },
  });
}

const EMPLOYEE = 'emp-001';
const LOCATION = 'loc-nyc';

const PAYLOAD = {
  employeeId: EMPLOYEE,
  locationId: LOCATION,
  days: 3,
  startDate: '2026-05-01',
  endDate: '2026-05-03',
};

const seedBalance = (): Balance => ({
  employeeId: EMPLOYEE,
  locationId: LOCATION,
  available: 12,
  pending: 0,
  unit: 'days',
  asOf: new Date().toISOString(),
});

beforeEach(() => resetMswStore());

describe('useSubmitRequest — optimistic update', () => {
  it('immediately decrements balance before HCM responds', async () => {
    const qc = makeClient();
    const wrapper = makeWrapper(qc);

    qc.setQueryData<Balance[]>(['balances', EMPLOYEE], [seedBalance()]);

    const { result } = renderHook(() => useSubmitRequest(EMPLOYEE), { wrapper });

    // Slow MSW handler so the mutation stays in-flight long enough to observe optimistic state
    server.use(
      http.post('/api/hcm/requests', async () => {
        await new Promise((r) => setTimeout(r, 300));
        return HttpResponse.json({
          data: { id: 'req-1', ...PAYLOAD, status: 'pending', submittedAt: new Date().toISOString() },
        });
      }),
    );

    // Fire mutation and wait for onMutate to complete (async cancelQueries + setQueryData)
    act(() => { result.current.mutate(PAYLOAD); });

    // waitFor polls until onMutate has applied the optimistic decrement
    await waitFor(() => {
      const cached = qc.getQueryData<Balance[]>(['balances', EMPLOYEE]);
      const b = cached?.find((b) => b.locationId === LOCATION);
      expect(b?.available).toBe(9); // 12 - 3
    });

    const cached = qc.getQueryData<Balance[]>(['balances', EMPLOYEE]);
    const balance = cached?.find((b) => b.locationId === LOCATION);
    expect(balance?.pending).toBe(3);
  });

  it('rolls back balance on HCM error (insufficient balance)', async () => {
    const qc = makeClient();
    const wrapper = makeWrapper(qc);

    qc.setQueryData<Balance[]>(['balances', EMPLOYEE], [seedBalance()]);

    server.use(
      http.post('/api/hcm/requests', () =>
        HttpResponse.json(
          { error: { code: 'INSUFFICIENT_BALANCE', available: 12, requested: 3 } },
          { status: 422 },
        ),
      ),
    );

    const { result } = renderHook(() => useSubmitRequest(EMPLOYEE), { wrapper });

    act(() => { result.current.mutate(PAYLOAD); });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const balances = qc.getQueryData<Balance[]>(['balances', EMPLOYEE]);
    const balance = balances?.find((b) => b.locationId === LOCATION);
    expect(balance?.available).toBe(12); // rolled back
  });

  it('handles silent failure by rolling back', async () => {
    const qc = makeClient();
    const wrapper = makeWrapper(qc);

    qc.setQueryData<Balance[]>(['balances', EMPLOYEE], [seedBalance()]);

    // _silentFailure is inside data so hcmFetch passes it through
    server.use(
      http.post('/api/hcm/requests', () =>
        HttpResponse.json({
          data: {
            id: 'req-fail',
            ...PAYLOAD,
            status: 'pending',
            submittedAt: new Date().toISOString(),
            _silentFailure: true,
          },
        }),
      ),
    );

    const { result } = renderHook(() => useSubmitRequest(EMPLOYEE), { wrapper });

    act(() => { result.current.mutate(PAYLOAD); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // onSuccess should detect _silentFailure and restore previousBalances
    const balances = qc.getQueryData<Balance[]>(['balances', EMPLOYEE]);
    const balance = balances?.find((b) => b.locationId === LOCATION);
    expect(balance?.available).toBe(12); // restored
  });
});

describe('useSubmitRequest — success path', () => {
  it('replaces optimistic request with real request on success', async () => {
    const qc = makeClient();
    const wrapper = makeWrapper(qc);

    qc.setQueryData<Balance[]>(['balances', EMPLOYEE], [seedBalance()]);

    const { result } = renderHook(() => useSubmitRequest(EMPLOYEE), { wrapper });

    act(() => { result.current.mutate(PAYLOAD); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const reqs = qc.getQueryData<{ id: string; status: string }[]>(
      ['requests', 'employee', EMPLOYEE],
    );
    expect(reqs?.some((r) => r.status === 'pending' && !r.id.startsWith('optimistic-'))).toBe(true);
  });
});
