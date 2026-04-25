import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BalanceTable } from '@/components/BalanceTable';
import type { Balance } from '@/types';

const LOCATION_NAMES = { 'loc-nyc': 'New York', 'loc-lon': 'London' };

const baseBalance: Balance = {
  employeeId: 'emp-001',
  locationId: 'loc-nyc',
  available: 12,
  pending: 0,
  unit: 'days',
  asOf: new Date().toISOString(),
};

const staleBalance: Balance = {
  ...baseBalance,
  asOf: new Date(Date.now() - 8 * 60 * 1000).toISOString(), // 8 min ago
};

const meta: Meta<typeof BalanceTable> = {
  title: 'ExampleHR/BalanceTable',
  component: BalanceTable,
  args: { locationNames: LOCATION_NAMES },
};

export default meta;
type Story = StoryObj<typeof BalanceTable>;

export const Loading: Story = {
  args: { isLoading: true, isError: false, balances: undefined },
};

export const Empty: Story = {
  args: { isLoading: false, isError: false, balances: [] },
};

export const Error: Story = {
  args: { isLoading: false, isError: true, balances: undefined },
};

export const Loaded: Story = {
  args: {
    isLoading: false,
    isError: false,
    balances: [
      baseBalance,
      { ...baseBalance, locationId: 'loc-lon', available: 5 },
    ],
  },
};

export const WithPending: Story = {
  name: 'Optimistic Pending (balance decremented)',
  args: {
    isLoading: false,
    isError: false,
    balances: [
      { ...baseBalance, available: 9, pending: 3 },
    ],
  },
};

export const Stale: Story = {
  name: 'Stale (balance older than 5 minutes)',
  args: {
    isLoading: false,
    isError: false,
    balances: [staleBalance],
  },
};

export const MultipleLocationsWithStale: Story = {
  args: {
    isLoading: false,
    isError: false,
    balances: [
      baseBalance,
      { ...staleBalance, locationId: 'loc-lon', available: 2 },
    ],
  },
};
