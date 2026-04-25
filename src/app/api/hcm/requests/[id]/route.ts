import { NextRequest, NextResponse } from 'next/server';
import {
  getBalance,
  getRequest,
  saveRequest,
  setBalance,
} from '@/lib/hcm-store';

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

  const request = getRequest(id);
  if (!request) {
    return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  }

  if (request.status !== 'pending') {
    return NextResponse.json(
      { error: { code: 'CONFLICT', message: `Request already ${request.status}` } },
      { status: 409 },
    );
  }

  const balance = getBalance(request.employeeId, request.locationId);
  if (!balance) {
    return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  }

  const now = new Date().toISOString();

  if (decision === 'approved') {
    // Confirm the deduction (already removed from available on submission)
    // Just reduce the pending counter
    setBalance({
      ...balance,
      pending: Math.max(0, balance.pending - request.days),
    });
  } else {
    // Denied: restore available balance
    setBalance({
      ...balance,
      available: balance.available + request.days,
      pending: Math.max(0, balance.pending - request.days),
    });
  }

  const updated = {
    ...request,
    status: decision,
    decidedAt: now,
    decisionNote,
  } as const;

  saveRequest(updated);

  return NextResponse.json({ data: updated });
}
