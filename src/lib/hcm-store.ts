/**
 * HCM mock store.
 * Uses Vercel KV (Redis) in production when KV_REST_API_URL is set,
 * falls back to a global in-memory store for local development.
 */

import type { Balance, Employee, Location, TimeOffRequest } from '@/types';

const SILENT_FAILURE_RATE = 0.05;
const KV_KEY = 'hcm:store:v1';
const HAS_KV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

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

// ─── KV backend ───────────────────────────────────────────────────────────────

async function kvLoad(): Promise<StoreData> {
  const { kv } = await import('@vercel/kv');
  const data = await kv.get<StoreData>(KV_KEY);
  if (!data) {
    const seed = makeSeedData();
    await kv.set(KV_KEY, seed);
    return seed;
  }
  return data;
}

async function kvSave(data: StoreData): Promise<void> {
  const { kv } = await import('@vercel/kv');
  await kv.set(KV_KEY, data);
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
  return HAS_KV ? kvLoad() : memLoad();
}

export async function saveStore(data: StoreData): Promise<void> {
  if (HAS_KV) await kvSave(data);
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
