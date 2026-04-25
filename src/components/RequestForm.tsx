'use client';

import { useState } from 'react';
import { Button } from './ui/Button';
import { Alert } from './ui/Alert';
import type { Balance, SubmitRequestPayload } from '@/types';
import { HCMApiError } from '@/lib/api';

interface RequestFormProps {
  employeeId: string;
  balances: Balance[];
  onSubmit: (payload: SubmitRequestPayload) => void;
  isSubmitting: boolean;
  submitError: Error | null;
  lastSubmitStatus?: 'optimistic-pending' | 'rolled-back' | 'pending' | null;
  locationNames?: Record<string, string>;
}

export function RequestForm({
  employeeId,
  balances,
  onSubmit,
  isSubmitting,
  submitError,
  lastSubmitStatus,
  locationNames = {},
}: RequestFormProps) {
  const [locationId, setLocationId] = useState(balances[0]?.locationId ?? '');
  // Use string so the input is truly empty until the user types
  const [daysStr, setDaysStr] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');

  const days = daysStr === '' ? 0 : parseInt(daysStr, 10);
  const selectedBalance = balances.find((b) => b.locationId === locationId);
  const isInsufficient = daysStr !== '' && selectedBalance ? days > selectedBalance.available : false;
  const isDaysEmpty = daysStr === '' || days < 1;

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (isInsufficient || isDaysEmpty || !locationId || !startDate || !endDate) return;
    onSubmit({ employeeId, locationId, days, startDate, endDate, note: note || undefined });
  }

  const hcmError = submitError instanceof HCMApiError ? submitError.hcmError : null;

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="request-form"
      className="space-y-4 rounded-lg border border-gray-200 bg-white p-6"
    >
      <h2 className="text-base font-semibold text-gray-900">Request Time Off</h2>

      {lastSubmitStatus === 'rolled-back' && (
        <Alert variant="error" title="Request not submitted">
          {hcmError?.code === 'INSUFFICIENT_BALANCE'
            ? `Insufficient balance — ${(hcmError as { available: number }).available} days available.`
            : 'The HCM system did not accept this request. Your balance has been restored. Please try again.'}
        </Alert>
      )}

      {lastSubmitStatus === 'optimistic-pending' && (
        <Alert variant="info" title="Submitting…">
          Your request is being processed. Balance shown reflects your submission.
        </Alert>
      )}

      {lastSubmitStatus === 'pending' && (
        <Alert variant="success" title="Request submitted">
          Your request is pending manager approval.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="location">
            Location
          </label>
          <select
            id="location"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          >
            {balances.map((b) => (
              <option key={b.locationId} value={b.locationId}>
                {locationNames[b.locationId] ?? b.locationId} ({b.available} days available)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="days">
            Days requested
          </label>
          <input
            id="days"
            type="number"
            min={1}
            max={selectedBalance?.available ?? undefined}
            value={daysStr}
            placeholder="e.g. 3"
            onChange={(e) => {
              // Allow only positive integers; strip leading zeros
              const raw = e.target.value.replace(/^0+(?=\d)/, '');
              setDaysStr(raw);
            }}
            className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 ${isInsufficient ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
            required
          />
          {isInsufficient && (
            <p className="mt-1 text-xs text-red-600">
              Exceeds available balance ({selectedBalance?.available} days).
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="startDate">
            Start date
          </label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="endDate">
            End date
          </label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="note">
            Note (optional)
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <Button
        type="submit"
        loading={isSubmitting}
        disabled={isInsufficient || isDaysEmpty || !locationId || !startDate || !endDate}
      >
        Submit Request
      </Button>
    </form>
  );
}
