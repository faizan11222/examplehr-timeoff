/**
 * HCM mock store.
 * Production: reads from Vercel Edge Config, writes back via Vercel REST API.
 * Local dev: in-memory global (single Next.js process).
 */

import type { Balance, Employee, Location, TimeOffRequest } from '@/types';

const SILENT_FAILURE_RATE = 0.05;
const EC_KEY = 'hcm-store-data';

const HAS_EC = !!(
  process.env.EDGE_CONFIG &&
  process.env.VERCEL_API_TOKEN &&
  process.env.EDGE_CONFIG_ID
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoreData {
  balances: Record<string, Balance>;
  requests: Record<string, TimeOffRequest>;
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

export const LOCATIONS: Record<string, Location> = {
  'loc-nyc': { id: 'loc-nyc', name: 'New York' },
  'loc-lon': { id: 'loc-lon', name: 'London' },
  'loc-syd': { id: 'loc-syd', name: 'Sydney' },
};

export const EMPLOYEES: Record<string, Employee> = {
  'emp-001': { id: 'emp-001', name: 'Alice Johnson', email: 'alice@examplehr.com', locationIds: ['loc-nyc', 'loc-lon'] },
  'emp-002': { id: 'emp-002', name: 'Bob Smith', email: 'bob@examplehr.com', locationIds: ['loc-nyc'] },
  'mgr-001': { id: 'mgr-001', name: 'Carol Martinez', email: 'carol@examplehr.com', locationIds: ['loc-nyc', 'loc-lon', 'loc-syd'] },
};

function makeSeedData(): StoreData {
  const seed: Array<[string, string, number]> = [
    ['emp-001', 'loc-nyc', 12],
    ['emp-001', 'loc-lon', 5],
    ['emp-002', 'loc-nyc', 8],
    ['mgr-001', 'loc-nyc', 15],
    ['mgr-001', 'loc-lon', 10],
    ['mgr-001', 'loc-syd', 7],
  ];
  const balances: Record<string, Balance> = {};
  for (const [eid, lid, avail] of seed) {
    balances[`${eid}::${lid}`] = {
      employeeId: eid, locationId: lid,
      available: avail, pending: 0, unit: 'days',
      asOf: new Date().toISOString(),
    };
  }
  return { balances, requests: {} };
}

// ─── Edge Config backend ──────────────────────────────────────────────────────

async function ecLoad(): Promise<StoreData> {
  const { get } = await import('@vercel/edge-config');
  const data = await get<StoreData>(EC_KEY);
  if (!data) {
    const seed = makeSeedData();
    await ecSave(seed);
    return seed;
  }
  return data;
}

async function ecSave(data: StoreData): Promise<void> {
  const ecId = process.env.EDGE_CONFIG_ID!;
  const teamId = process.env.VERCEL_TEAM_ID;
  const token = process.env.VERCEL_API_TOKEN!;

  const url = teamId
    ? `https://api.vercel.com/v1/edge-config/${ecId}/items?teamId=${teamId}`
    : `https://api.vercel.com/v1/edge-config/${ecId}/items`;

  await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [{ operation: 'upsert', key: EC_KEY, value: data }],
    }),
  });
}

// ─── In-memory fallback ───────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __hcmStore: StoreData | undefined;
}

function memLoad(): StoreData {
  if (!globalThis.__hcmStore) {
    globalThis.__hcmStore = makeSeedData();
  }
  return globalThis.__hcmStore;
}

function memSave(data: StoreData) {
  globalThis.__hcmStore = data;
}

// ─── Public async API (used by all route handlers) ───────────────────────────

export async function loadStore(): Promise<StoreData> {
  return HAS_EC ? ecLoad() : memLoad();
}

export async function saveStore(data: StoreData): Promise<void> {
  if (HAS_EC) await ecSave(data);
  else memSave(data);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function bkey(employeeId: string, locationId: string) {
  return `${employeeId}::${locationId}`;
}

export function getEmployee(id: string): Employee | null {
  return EMPLOYEES[id] ?? null;
}

export function getLocation(id: string): Location | null {
  return LOCATIONS[id] ?? null;
}

export function willSilentlyFail(): boolean {
  return Math.random() < SILENT_FAILURE_RATE;
}
