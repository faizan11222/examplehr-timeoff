import { NextRequest, NextResponse } from 'next/server';
import { loadStore, getEmployee } from '@/lib/hcm-store';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');
  const delay = Number(searchParams.get('delay') ?? 0);

  if (delay > 0) await new Promise((r) => setTimeout(r, delay));

  if (employeeId && !getEmployee(employeeId)) {
    return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  }

  const store = await loadStore();
  const all = Object.values(store.balances);
  const result = employeeId ? all.filter((b) => b.employeeId === employeeId) : all;

  return NextResponse.json({ data: result });
}
