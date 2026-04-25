/**
 * In-memory HCM state used by mock route handlers.
 * Uses a global to survive Next.js hot-reload in dev.
 */

import type { Balance, Employee, Location, TimeOffRequest } from '@/types';

const SILENT_FAILURE_RATE = 0.05; // 5% of POSTs silently fail

interface HCMStore {
  balances: Map<string, Balance>;
  requests: Map<string, TimeOffRequest>;
  employees: Map<string, Employee>;
  locations: Map<string, Location>;
}

function balanceKey(employeeId: string, locationId: string) {
  return `${employeeId}::${locationId}`;
}

function makeStore(): HCMStore {
  const locations = new Map<string, Location>([
    ['loc-nyc', { id: 'loc-nyc', name: 'New York' }],
    ['loc-lon', { id: 'loc-lon', name: 'London' }],
    ['loc-syd', { id: 'loc-syd', name: 'Sydney' }],
  ]);

  const employees = new Map<string, Employee>([
    [
      'emp-001',
      {
        id: 'emp-001',
        name: 'Alice Johnson',
        email: 'alice@examplehr.com',
        locationIds: ['loc-nyc', 'loc-lon'],
      },
    ],
    [
      'emp-002',
      {
        id: 'emp-002',
        name: 'Bob Smith',
        email: 'bob@examplehr.com',
        locationIds: ['loc-nyc'],
      },
    ],
    [
      'mgr-001',
      {
        id: 'mgr-001',
        name: 'Carol Martinez',
        email: 'carol@examplehr.com',
        locationIds: ['loc-nyc', 'loc-lon', 'loc-syd'],
      },
    ],
  ]);

  const balances = new Map<string, Balance>();
  const seed: Array<[string, string, number]> = [
    ['emp-001', 'loc-nyc', 12],
    ['emp-001', 'loc-lon', 5],
    ['emp-002', 'loc-nyc', 8],
    ['mgr-001', 'loc-nyc', 15],
    ['mgr-001', 'loc-lon', 10],
    ['mgr-001', 'loc-syd', 7],
  ];
  for (const [eid, lid, avail] of seed) {
    balances.set(balanceKey(eid, lid), {
      employeeId: eid,
      locationId: lid,
      available: avail,
      pending: 0,
      unit: 'days',
      asOf: new Date().toISOString(),
    });
  }

  return { balances, requests: new Map(), employees, locations };
}

// Attach to globalThis so Next.js hot-reload reuses the same instance
declare global {
  // eslint-disable-next-line no-var
  var __hcmStore: HCMStore | undefined;
}

export function getStore(): HCMStore {
  if (!globalThis.__hcmStore) {
    globalThis.__hcmStore = makeStore();
  }
  return globalThis.__hcmStore;
}

export function getBalance(employeeId: string, locationId: string): Balance | null {
  return getStore().balances.get(balanceKey(employeeId, locationId)) ?? null;
}

export function getBalancesForEmployee(employeeId: string): Balance[] {
  return Array.from(getStore().balances.values()).filter(
    (b) => b.employeeId === employeeId,
  );
}

export function getAllBalances(): Balance[] {
  return Array.from(getStore().balances.values());
}

export function setBalance(balance: Balance) {
  const store = getStore();
  store.balances.set(balanceKey(balance.employeeId, balance.locationId), {
    ...balance,
    asOf: new Date().toISOString(),
  });
}

export function getRequest(id: string): TimeOffRequest | null {
  return getStore().requests.get(id) ?? null;
}

export function getRequestsForEmployee(employeeId: string): TimeOffRequest[] {
  return Array.from(getStore().requests.values()).filter(
    (r) => r.employeeId === employeeId,
  );
}

export function getPendingRequests(): TimeOffRequest[] {
  return Array.from(getStore().requests.values()).filter(
    (r) => r.status === 'pending',
  );
}

export function saveRequest(req: TimeOffRequest) {
  getStore().requests.set(req.id, req);
}

export function getEmployee(id: string): Employee | null {
  return getStore().employees.get(id) ?? null;
}

export function getAllEmployees(): Employee[] {
  return Array.from(getStore().employees.values());
}

export function getLocation(id: string): Location | null {
  return getStore().locations.get(id) ?? null;
}

export function willSilentlyFail(): boolean {
  return Math.random() < SILENT_FAILURE_RATE;
}

export function applyAnniversaryBonus(employeeId: string, bonusDays = 5): Balance[] {
  const store = getStore();
  const updated: Balance[] = [];
  for (const [key, balance] of store.balances) {
    if (balance.employeeId === employeeId) {
      const next = { ...balance, available: balance.available + bonusDays, asOf: new Date().toISOString() };
      store.balances.set(key, next);
      updated.push(next);
    }
  }
  return updated;
}
