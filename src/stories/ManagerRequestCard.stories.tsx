import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ManagerRequestCard } from '@/components/RequestCard';
import type { Balance, TimeOffRequest } from '@/types';

const LOCATION_NAMES = { 'loc-nyc': 'New York', 'loc-lon': 'London' };

const pendingRequest: TimeOffRequest = {
  id: 'req-mgr-001',
  employeeId: 'emp-001',
  locationId: 'loc-nyc',
  days: 3,
  startDate: '2026-05-12',
  endDate: '2026-05-14',
  status: 'pending',
  submittedAt: new Date().toISOString(),
  note: 'Family event',
};

function makeClient(balance?: Balance | null) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (balance !== undefined) {
    qc.setQueryData(
      ['balance', 'emp-001', 'loc-nyc'],
      balance,
    );
  }
  return qc;
}

const liveBalance: Balance = {
  employeeId: 'emp-001',
  locationId: 'loc-nyc',
  available: 12,
  pending: 3,
  unit: 'days',
  asOf: new Date().toISOString(),
};

const meta: Meta = {
  title: 'ExampleHR/ManagerRequestCard',
  decorators: [
    (Story, ctx) => {
      const qc = makeClient((ctx.args as { _balance?: Balance | null })._balance ?? liveBalance);
      return (
        <QueryClientProvider client={qc}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

export const WithLiveBalance: StoryObj = {
  name: 'Pending — live balance loaded',
  render: () => (
    <ManagerRequestCard request={pendingRequest} locationNames={LOCATION_NAMES} />
  ),
};

export const BalanceLoading: StoryObj = {
  name: 'Pending — balance loading',
  decorators: [
    (Story) => {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: Infinity } },
      });
      // No pre-seeded data → query fires, shows spinner
      return (
        <QueryClientProvider client={qc}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
  render: () => (
    <ManagerRequestCard request={pendingRequest} locationNames={LOCATION_NAMES} />
  ),
};

export const Approved: StoryObj = {
  render: () => (
    <ManagerRequestCard
      request={{
        ...pendingRequest,
        status: 'approved',
        decidedAt: new Date().toISOString(),
      }}
      locationNames={LOCATION_NAMES}
    />
  ),
};

export const Denied: StoryObj = {
  render: () => (
    <ManagerRequestCard
      request={{
        ...pendingRequest,
        status: 'denied',
        decidedAt: new Date().toISOString(),
        decisionNote: 'Critical sprint underway.',
      }}
      locationNames={LOCATION_NAMES}
    />
  ),
};

export const ConflictAtApproval: StoryObj = {
  name: 'HCM Conflict (balance changed between load and approval)',
  render: () => (
    <ManagerRequestCard
      request={{ ...pendingRequest, status: 'hcm-conflict' }}
      locationNames={LOCATION_NAMES}
    />
  ),
};
