import { NextRequest, NextResponse } from 'next/server';
import { loadStore, saveStore, getEmployee } from '@/lib/hcm-store';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { employeeId, bonusDays = 5 } = body;

  if (!employeeId) {
    return NextResponse.json(
      { error: { code: 'INVALID_DIMENSION', field: 'employeeId' } },
      { status: 400 },
    );
  }
  if (!getEmployee(employeeId)) {
    return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  }

  const store = await loadStore();
  const updated = [];

  for (const key of Object.keys(store.balances)) {
    const b = store.balances[key];
    if (b.employeeId === employeeId) {
      const next = { ...b, available: b.available + bonusDays, asOf: new Date().toISOString() };
      store.balances[key] = next;
      updated.push(next);
    }
  }

  await saveStore(store);
  return NextResponse.json({ data: updated });
}
