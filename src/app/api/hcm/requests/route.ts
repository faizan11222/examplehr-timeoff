import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { loadStore, saveStore, getEmployee, getLocation, bkey, willSilentlyFail } from '@/lib/hcm-store';
import type { TimeOffRequest } from '@/types';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');
  const statusFilter = searchParams.get('status');

  const store = await loadStore();
  let requests = Object.values(store.requests);

  if (employeeId) requests = requests.filter((r) => r.employeeId === employeeId);
  if (statusFilter) requests = requests.filter((r) => r.status === statusFilter);

  return NextResponse.json({ data: requests });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { employeeId, locationId, days, startDate, endDate, note } = body;

  const delay = Number(body.delay ?? 0);
  if (delay > 0) await new Promise((r) => setTimeout(r, delay));

  if (!employeeId || !locationId || !days || !startDate || !endDate) {
    return NextResponse.json(
      { error: { code: 'INVALID_DIMENSION', field: 'missing required fields' } },
      { status: 400 },
    );
  }
  if (!getEmployee(employeeId)) {
    return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  }
  if (!getLocation(locationId)) {
    return NextResponse.json(
      { error: { code: 'INVALID_DIMENSION', field: 'locationId' } },
      { status: 404 },
    );
  }

  const store = await loadStore();
  const balance = store.balances[bkey(employeeId, locationId)];
  if (!balance) {
    return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  }

  if (balance.available < days) {
    return NextResponse.json(
      { error: { code: 'INSUFFICIENT_BALANCE', available: balance.available, requested: days } },
      { status: 422 },
    );
  }

  // Simulate silent failure — return 200 but don't commit
  if (willSilentlyFail()) {
    const fakeRequest: TimeOffRequest = {
      id: uuidv4(), employeeId, locationId, days,
      startDate, endDate, note, status: 'pending',
      submittedAt: new Date().toISOString(),
    };
    return NextResponse.json({ data: { ...fakeRequest, _silentFailure: true } });
  }

  const request: TimeOffRequest = {
    id: uuidv4(), employeeId, locationId, days,
    startDate, endDate, note, status: 'pending',
    submittedAt: new Date().toISOString(),
  };

  store.balances[bkey(employeeId, locationId)] = {
    ...balance,
    available: balance.available - days,
    pending: balance.pending + days,
    asOf: new Date().toISOString(),
  };
  store.requests[request.id] = request;

  await saveStore(store);

  return NextResponse.json({ data: request });
}
