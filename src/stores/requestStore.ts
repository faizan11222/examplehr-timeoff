'use client';

import { create } from 'zustand';

export interface InFlightMutation {
  mutationId: string;
  employeeId: string;
  locationId: string;
  optimisticDelta: number; // negative = deducted days
}

export interface ReconciliationBanner {
  id: string;
  employeeId: string;
  locationId: string;
  previousAvailable: number;
  newAvailable: number;
  reason: 'anniversary-bonus' | 'background-refresh' | 'manager-decision';
}

interface RequestStore {
  // Registry of in-flight mutations keyed by "employeeId::locationId"
  inFlight: Map<string, InFlightMutation>;
  // Banners waiting for user acknowledgement
  banners: ReconciliationBanner[];

  registerInFlight: (mutation: InFlightMutation) => void;
  clearInFlight: (employeeId: string, locationId: string) => void;
  addBanner: (banner: Omit<ReconciliationBanner, 'id'>) => void;
  dismissBanner: (id: string) => void;
}

function balanceKey(employeeId: string, locationId: string) {
  return `${employeeId}::${locationId}`;
}

export const useRequestStore = create<RequestStore>((set) => ({
  inFlight: new Map(),
  banners: [],

  registerInFlight: (mutation) =>
    set((state) => {
      const next = new Map(state.inFlight);
      next.set(balanceKey(mutation.employeeId, mutation.locationId), mutation);
      return { inFlight: next };
    }),

  clearInFlight: (employeeId, locationId) =>
    set((state) => {
      const next = new Map(state.inFlight);
      next.delete(balanceKey(employeeId, locationId));
      return { inFlight: next };
    }),

  addBanner: (banner) =>
    set((state) => ({
      banners: [
        ...state.banners,
        { ...banner, id: `banner-${Date.now()}-${Math.random()}` },
      ],
    })),

  dismissBanner: (id) =>
    set((state) => ({
      banners: state.banners.filter((b) => b.id !== id),
    })),
}));

export function useHasInFlight(employeeId: string, locationId: string): boolean {
  return useRequestStore((s) => s.inFlight.has(balanceKey(employeeId, locationId)));
}
