import { NextRequest, NextResponse } from 'next/server';
import { applyAnniversaryBonus, getEmployee } from '@/lib/hcm-store';

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

  const updated = applyAnniversaryBonus(employeeId, bonusDays);

  return NextResponse.json({ data: updated });
}
