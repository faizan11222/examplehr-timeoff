import { NextRequest, NextResponse } from 'next/server';
import { getAllBalances, getBalancesForEmployee, getEmployee } from '@/lib/hcm-store';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');
  const delay = Number(searchParams.get('delay') ?? 0);

  if (delay > 0) await new Promise((r) => setTimeout(r, delay));

  if (employeeId) {
    if (!getEmployee(employeeId)) {
      return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    }
    return NextResponse.json({ data: getBalancesForEmployee(employeeId) });
  }

  return NextResponse.json({ data: getAllBalances() });
}
