import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RequestForm } from '@/components/RequestForm';
import { HCMApiError } from '@/lib/api';
import type { Balance } from '@/types';

const balances: Balance[] = [
  {
    employeeId: 'emp-001',
    locationId: 'loc-nyc',
    available: 10,
    pending: 0,
    unit: 'days',
    asOf: new Date().toISOString(),
  },
];

const LOCATION_NAMES = { 'loc-nyc': 'New York' };

type FormProps = Parameters<typeof RequestForm>[0];

function setup(overrides: Partial<FormProps> = {}) {
  const onSubmit = vi.fn();
  const defaults: FormProps = {
    employeeId: 'emp-001',
    balances,
    onSubmit,
    isSubmitting: false,
    submitError: null,
    lastSubmitStatus: null,
    locationNames: LOCATION_NAMES,
  };
  const utils = render(<RequestForm {...defaults} {...overrides} />);
  return { ...utils, onSubmit };
}

describe('RequestForm', () => {
  it('renders all form fields', () => {
    setup();
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/days requested/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('blocks submit when days exceeds available balance', async () => {
    const { onSubmit } = setup();
    const daysInput = screen.getByLabelText(/days requested/i);
    const startDate = screen.getByLabelText(/start date/i);
    const endDate = screen.getByLabelText(/end date/i);

    await userEvent.clear(daysInput);
    await userEvent.type(daysInput, '15'); // exceeds 10
    fireEvent.change(startDate, { target: { value: '2026-05-01' } });
    fireEvent.change(endDate, { target: { value: '2026-05-15' } });

    expect(screen.getByText(/exceeds available balance/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with correct payload for valid input', async () => {
    const { onSubmit } = setup();
    const daysInput = screen.getByLabelText(/days requested/i);
    const startDate = screen.getByLabelText(/start date/i);
    const endDate = screen.getByLabelText(/end date/i);

    await userEvent.clear(daysInput);
    await userEvent.type(daysInput, '3');
    fireEvent.change(startDate, { target: { value: '2026-05-01' } });
    fireEvent.change(endDate, { target: { value: '2026-05-03' } });

    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: 'emp-001',
        locationId: 'loc-nyc',
        days: 3,
        startDate: '2026-05-01',
        endDate: '2026-05-03',
      }),
    );
  });

  it('shows optimistic-pending alert while submitting', () => {
    setup({ isSubmitting: true, lastSubmitStatus: 'optimistic-pending' });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/being processed/i)).toBeInTheDocument();
  });

  it('shows rolled-back alert on HCM rejection', () => {
    setup({
      lastSubmitStatus: 'rolled-back',
      submitError: new HCMApiError(422, {
        code: 'INSUFFICIENT_BALANCE',
        available: 2,
        requested: 5,
      }),
    });
    expect(screen.getByText(/insufficient balance/i)).toBeInTheDocument();
  });

  it('shows generic rolled-back alert on silent failure', () => {
    setup({ lastSubmitStatus: 'rolled-back', submitError: null });
    expect(screen.getByText(/HCM system did not accept/i)).toBeInTheDocument();
  });

  it('shows success alert after HCM accepts', () => {
    setup({ lastSubmitStatus: 'pending' });
    expect(screen.getByText(/pending manager approval/i)).toBeInTheDocument();
  });

  it('disables submit button while submitting', () => {
    setup({ isSubmitting: true });
    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
  });
});
