import { NextRequest, NextResponse } from 'next/server';
import { getBalance, getEmployee, getLocation } from '@/lib/hcm-store';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');
  const locationId = searchParams.get('locationId');

  if (!employeeId || !locationId) {
    return NextResponse.json(
      { error: { code: 'INVALID_DIMENSION', field: 'employeeId or locationId' } },
      { status: 400 },
    );
  }

  const delay = Number(searchParams.get('delay') ?? 0);
  if (delay > 0) await new Promise((r) => setTimeout(r, delay));

  if (!getEmployee(employeeId)) {
    return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  }
  if (!getLocation(locationId)) {
    return NextResponse.json(
      { error: { code: 'INVALID_DIMENSION', field: 'locationId' } },
      { status: 404 },
    );
  }

  const balance = getBalance(employeeId, locationId);
  if (!balance) {
    return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  }

  return NextResponse.json({ data: balance });
}
