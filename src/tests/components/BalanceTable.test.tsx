import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BalanceTable } from '@/components/BalanceTable';
import type { Balance } from '@/types';

const LOCATION_NAMES = { 'loc-nyc': 'New York', 'loc-lon': 'London' };

const makeBalance = (overrides: Partial<Balance> = {}): Balance => ({
  employeeId: 'emp-001',
  locationId: 'loc-nyc',
  available: 10,
  pending: 0,
  unit: 'days',
  asOf: new Date().toISOString(),
  ...overrides,
});

describe('BalanceTable', () => {
  it('renders loading state', () => {
    render(<BalanceTable isLoading isError={false} balances={undefined} />);
    expect(screen.getByTestId('balance-table-loading')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders error state', () => {
    render(<BalanceTable isLoading={false} isError balances={undefined} />);
    expect(screen.getByTestId('balance-table-error')).toBeInTheDocument();
  });

  it('renders empty state when no balances', () => {
    render(<BalanceTable isLoading={false} isError={false} balances={[]} />);
    expect(screen.getByTestId('balance-table-empty')).toBeInTheDocument();
  });

  it('renders a row per balance', () => {
    const balances = [
      makeBalance({ locationId: 'loc-nyc', available: 12 }),
      makeBalance({ locationId: 'loc-lon', available: 5 }),
    ];
    render(
      <BalanceTable
        isLoading={false}
        isError={false}
        balances={balances}
        locationNames={LOCATION_NAMES}
      />,
    );
    expect(screen.getByTestId('balance-row-loc-nyc')).toBeInTheDocument();
    expect(screen.getByTestId('balance-row-loc-lon')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows pending spinner when balance has pending days', () => {
    render(
      <BalanceTable
        isLoading={false}
        isError={false}
        balances={[makeBalance({ available: 9, pending: 3 })]}
        locationNames={LOCATION_NAMES}
      />,
    );
    expect(screen.getByText(/3 pending/i)).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /Processing/i })).toBeInTheDocument();
  });

  it('shows location name when provided', () => {
    render(
      <BalanceTable
        isLoading={false}
        isError={false}
        balances={[makeBalance()]}
        locationNames={LOCATION_NAMES}
      />,
    );
    expect(screen.getByText('New York')).toBeInTheDocument();
  });
});
