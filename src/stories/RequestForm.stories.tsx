import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { RequestForm } from '@/components/RequestForm';
import { HCMApiError } from '@/lib/api';
import type { Balance } from '@/types';

const LOCATION_NAMES = { 'loc-nyc': 'New York', 'loc-lon': 'London' };

const balances: Balance[] = [
  {
    employeeId: 'emp-001',
    locationId: 'loc-nyc',
    available: 12,
    pending: 0,
    unit: 'days',
    asOf: new Date().toISOString(),
  },
  {
    employeeId: 'emp-001',
    locationId: 'loc-lon',
    available: 5,
    pending: 0,
    unit: 'days',
    asOf: new Date().toISOString(),
  },
];

const meta: Meta<typeof RequestForm> = {
  title: 'ExampleHR/RequestForm',
  component: RequestForm,
  args: {
    employeeId: 'emp-001',
    balances,
    onSubmit: () => {},
    isSubmitting: false,
    submitError: null,
    lastSubmitStatus: null,
    locationNames: LOCATION_NAMES,
  },
};

export default meta;
type Story = StoryObj<typeof RequestForm>;

export const Default: Story = {};

export const Submitting: Story = {
  name: 'Submitting (isSubmitting = true)',
  args: { isSubmitting: true, lastSubmitStatus: 'optimistic-pending' },
};

export const SubmitSuccess: Story = {
  name: 'Submitted (awaiting manager)',
  args: { lastSubmitStatus: 'pending' },
};

export const HCMRejected: Story = {
  name: 'HCM Rejected (insufficient balance)',
  args: {
    lastSubmitStatus: 'rolled-back',
    submitError: new HCMApiError(422, {
      code: 'INSUFFICIENT_BALANCE',
      available: 2,
      requested: 5,
    }),
  },
};

export const HCMSilentlyWrong: Story = {
  name: 'HCM Silently Wrong (silent failure, rolled back)',
  args: {
    lastSubmitStatus: 'rolled-back',
    submitError: null,
  },
};

export const EmptyBalances: Story = {
  name: 'No Balances (empty state)',
  args: { balances: [] },
};
