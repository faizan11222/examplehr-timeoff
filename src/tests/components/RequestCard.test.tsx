import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RequestCard } from '@/components/RequestCard';
import type { TimeOffRequest } from '@/types';

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

const LOCATION_NAMES = { 'loc-nyc': 'New York' };

describe('RequestCard', () => {
  it('renders pending status', () => {
    render(<RequestCard request={base} locationNames={LOCATION_NAMES} />);
    expect(screen.getByText(/pending approval/i)).toBeInTheDocument();
  });

  it('renders optimistic-pending with spinner', () => {
    render(
      <RequestCard
        request={{ ...base, status: 'optimistic-pending' }}
        locationNames={LOCATION_NAMES}
      />,
    );
    expect(screen.getByText(/submitting/i)).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders approved status', () => {
    render(
      <RequestCard
        request={{ ...base, status: 'approved', decidedAt: new Date().toISOString() }}
        locationNames={LOCATION_NAMES}
      />,
    );
    expect(screen.getByText(/approved/i)).toBeInTheDocument();
  });

  it('renders denied status with decision note', () => {
    render(
      <RequestCard
        request={{
          ...base,
          status: 'denied',
          decisionNote: 'Coverage needed',
        }}
        locationNames={LOCATION_NAMES}
      />,
    );
    expect(screen.getByText(/denied/i)).toBeInTheDocument();
    expect(screen.getByText(/Coverage needed/i)).toBeInTheDocument();
  });

  it('renders rolled-back state', () => {
    render(
      <RequestCard
        request={{ ...base, status: 'rolled-back' }}
        locationNames={LOCATION_NAMES}
      />,
    );
    expect(screen.getByText(/not submitted/i)).toBeInTheDocument();
  });

  it('renders location name', () => {
    render(<RequestCard request={base} locationNames={LOCATION_NAMES} />);
    expect(screen.getByText(/New York/i)).toBeInTheDocument();
  });

  it('renders request dates', () => {
    render(<RequestCard request={base} locationNames={LOCATION_NAMES} />);
    // Dates shown as locale strings
    expect(screen.getByText(/5\/12\/2026|2026-05-12|May 12/i)).toBeInTheDocument();
  });
});
