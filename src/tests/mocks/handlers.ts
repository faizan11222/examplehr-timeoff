import { http, HttpResponse } from 'msw';
import type { Balance, TimeOffRequest } from '@/types';

// In-memory store for MSW handlers (test environment)
let balances: Balance[] = [
  {
    employeeId: 'emp-001',
    locationId: 'loc-nyc',
    available: 12,
    pending: 0,
    unit: 'days',
    asOf: new Date().toISOString(),
  },
  {
    employeeId: 'emp-001',
    locationId: 'loc-lon',
    available: 5,
    pending: 0,
    unit: 'days',
    asOf: new Date().toISOString(),
  },
];

let requests: TimeOffRequest[] = [];

export function resetMswStore() {
  balances = [
    {
      employeeId: 'emp-001',
      locationId: 'loc-nyc',
      available: 12,
      pending: 0,
      unit: 'days',
      asOf: new Date().toISOString(),
    },
    {
      employeeId: 'emp-001',
      locationId: 'loc-lon',
      available: 5,
      pending: 0,
      unit: 'days',
      asOf: new Date().toISOString(),
    },
  ];
  requests = [];
}

export const handlers = [
  // GET /api/hcm/balance
  http.get('/api/hcm/balance', ({ request }) => {
    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId');
    const locationId = url.searchParams.get('locationId');
    const balance = balances.find(
      (b) => b.employeeId === employeeId && b.locationId === locationId,
    );
    if (!balance) return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    return HttpResponse.json({ data: balance });
  }),

  // GET /api/hcm/balances
  http.get('/api/hcm/balances', ({ request }) => {
    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId');
    const result = employeeId ? balances.filter((b) => b.employeeId === employeeId) : balances;
    return HttpResponse.json({ data: result });
  }),

  // POST /api/hcm/requests
  http.post('/api/hcm/requests', async ({ request }) => {
    const body = await request.json() as {
      employeeId: string; locationId: string; days: number;
      startDate: string; endDate: string; note?: string;
    };
    const balance = balances.find(
      (b) => b.employeeId === body.employeeId && b.locationId === body.locationId,
    );
    if (!balance) return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    if (balance.available < body.days) {
      return HttpResponse.json(
        { error: { code: 'INSUFFICIENT_BALANCE', available: balance.available, requested: body.days } },
        { status: 422 },
      );
    }

    // Commit the write
    balances = balances.map((b) =>
      b.employeeId === body.employeeId && b.locationId === body.locationId
        ? { ...b, available: b.available - body.days, pending: b.pending + body.days, asOf: new Date().toISOString() }
        : b,
    );

    const req: TimeOffRequest = {
      id: `req-${Date.now()}`,
      ...body,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };
    requests.push(req);
    return HttpResponse.json({ data: req });
  }),

  // GET /api/hcm/requests
  http.get('/api/hcm/requests', ({ request }) => {
    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId');
    const status = url.searchParams.get('status');
    let result = requests;
    if (employeeId) result = result.filter((r) => r.employeeId === employeeId);
    if (status) result = result.filter((r) => r.status === status);
    return HttpResponse.json({ data: result });
  }),

  // PATCH /api/hcm/requests/:id
  http.patch('/api/hcm/requests/:id', async ({ params, request }) => {
    const body = await request.json() as { decision: 'approved' | 'denied'; decisionNote?: string };
    const req = requests.find((r) => r.id === params.id);
    if (!req) return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });

    const balance = balances.find(
      (b) => b.employeeId === req.employeeId && b.locationId === req.locationId,
    );

    if (balance) {
      if (body.decision === 'denied') {
        balances = balances.map((b) =>
          b.employeeId === req.employeeId && b.locationId === req.locationId
            ? { ...b, available: b.available + req.days, pending: Math.max(0, b.pending - req.days), asOf: new Date().toISOString() }
            : b,
        );
      } else {
        balances = balances.map((b) =>
          b.employeeId === req.employeeId && b.locationId === req.locationId
            ? { ...b, pending: Math.max(0, b.pending - req.days), asOf: new Date().toISOString() }
            : b,
        );
      }
    }

    const updated: TimeOffRequest = {
      ...req,
      status: body.decision,
      decidedAt: new Date().toISOString(),
      decisionNote: body.decisionNote,
    };
    requests = requests.map((r) => (r.id === updated.id ? updated : r));
    return HttpResponse.json({ data: updated });
  }),

  // POST /api/hcm/trigger/anniversary
  http.post('/api/hcm/trigger/anniversary', async ({ request }) => {
    const body = await request.json() as { employeeId: string; bonusDays?: number };
    const bonus = body.bonusDays ?? 5;
    const updated: Balance[] = [];
    balances = balances.map((b) => {
      if (b.employeeId === body.employeeId) {
        const next = { ...b, available: b.available + bonus, asOf: new Date().toISOString() };
        updated.push(next);
        return next;
      }
      return b;
    });
    return HttpResponse.json({ data: updated });
  }),
];
