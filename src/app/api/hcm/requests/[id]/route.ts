import { NextRequest, NextResponse } from 'next/server';
import { loadStore, saveStore, bkey } from '@/lib/hcm-store';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const { decision, decisionNote } = body;

  if (decision !== 'approved' && decision !== 'denied') {
    return NextResponse.json(
      { error: { code: 'INVALID_DIMENSION', field: 'decision' } },
      { status: 400 },
    );
  }

  const store = await loadStore();
  const request = store.requests[id];

  if (!request) {
    return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  }
  if (request.status !== 'pending') {
    return NextResponse.json(
      { error: { code: 'CONFLICT', message: `Request already ${request.status}` } },
      { status: 409 },
    );
  }

  const key = bkey(request.employeeId, request.locationId);
  const balance = store.balances[key];

  if (balance) {
    if (decision === 'approved') {
      store.balances[key] = {
        ...balance,
        pending: Math.max(0, balance.pending - request.days),
        asOf: new Date().toISOString(),
      };
    } else {
      store.balances[key] = {
        ...balance,
        available: balance.available + request.days,
        pending: Math.max(0, balance.pending - request.days),
        asOf: new Date().toISOString(),
      };
    }
  }

  const updated = {
    ...request,
    status: decision,
    decidedAt: new Date().toISOString(),
    decisionNote,
  } as const;

  store.requests[id] = updated;
  await saveStore(store);

  return NextResponse.json({ data: updated });
}
