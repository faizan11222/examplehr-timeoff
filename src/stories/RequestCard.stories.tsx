import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { RequestCard } from '@/components/RequestCard';
import type { TimeOffRequest } from '@/types';

const LOCATION_NAMES = { 'loc-nyc': 'New York', 'loc-lon': 'London' };

const base: TimeOffRequest = {
  id: 'req-001',
  employeeId: 'emp-001',
  locationId: 'loc-nyc',
  days: 3,
  startDate: '2026-05-12',
  endDate: '2026-05-14',
  status: 'pending',
  submittedAt: new Date().toISOString(),
};

const meta: Meta<typeof RequestCard> = {
  title: 'ExampleHR/RequestCard',
  component: RequestCard,
  args: { locationNames: LOCATION_NAMES },
};

export default meta;
type Story = StoryObj<typeof RequestCard>;

export const OptimisticPending: Story = {
  name: 'Optimistic Pending (submitting to HCM)',
  args: { request: { ...base, id: 'opt-001', status: 'optimistic-pending' } },
};

export const Pending: Story = {
  name: 'Pending (awaiting manager)',
  args: { request: base },
};

export const Approved: Story = {
  args: {
    request: {
      ...base,
      status: 'approved',
      decidedAt: new Date().toISOString(),
      decisionNote: 'Enjoy your vacation!',
    },
  },
};

export const Denied: Story = {
  args: {
    request: {
      ...base,
      status: 'denied',
      decidedAt: new Date().toISOString(),
      decisionNote: 'Team coverage needed during this period.',
    },
  },
};

export const RolledBack: Story = {
  name: 'Rolled Back (HCM rejected silently)',
  args: {
    request: {
      ...base,
      status: 'rolled-back',
    },
  },
};

export const HCMConflict: Story = {
  name: 'HCM Conflict (balance changed at decision time)',
  args: {
    request: {
      ...base,
      status: 'hcm-conflict',
    },
  },
};

export const WithNote: Story = {
  args: {
    request: { ...base, note: 'Family reunion in May', status: 'pending' },
  },
};
