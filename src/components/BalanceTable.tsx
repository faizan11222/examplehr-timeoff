'use client';

import { Balance } from '@/types';
import { Badge } from './ui/Badge';
import { Spinner } from './ui/Spinner';
import { StaleIndicator } from './StaleIndicator';

interface BalanceTableProps {
  balances: Balance[] | undefined;
  isLoading: boolean;
  isError: boolean;
  locationNames?: Record<string, string>;
}

export function BalanceTable({
  balances,
  isLoading,
  isError,
  locationNames = {},
}: BalanceTableProps) {
  if (isLoading) {
    return (
      <div
        data-testid="balance-table-loading"
        className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-6 text-gray-500"
      >
        <Spinner /> Loading balances…
      </div>
    );
  }

  if (isError) {
    return (
      <div
        data-testid="balance-table-error"
        className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700"
      >
        Failed to load balances. Please refresh.
      </div>
    );
  }

  if (!balances || balances.length === 0) {
    return (
      <div
        data-testid="balance-table-empty"
        className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500"
      >
        No leave balances found for your account.
      </div>
    );
  }

  return (
    <div data-testid="balance-table" className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Location
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Available
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Pending
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Unit
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              As of
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {balances.map((b) => (
            <BalanceRow
              key={`${b.employeeId}-${b.locationId}`}
              balance={b}
              locationName={locationNames[b.locationId] ?? b.locationId}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface BalanceRowProps {
  balance: Balance;
  locationName: string;
}

export function BalanceRow({ balance, locationName }: BalanceRowProps) {
  const isOptimistic = balance.available < 0; // defensive: shouldn't happen
  const hasPending = balance.pending > 0;

  return (
    <tr
      data-testid={`balance-row-${balance.locationId}`}
      className={`transition-colors ${hasPending ? 'bg-amber-50' : 'hover:bg-gray-50'}`}
    >
      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
        {locationName}
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
        <span className={`font-semibold ${isOptimistic ? 'text-red-600' : ''}`}>
          {balance.available}
        </span>
        <StaleIndicator asOf={balance.asOf} />
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
        {hasPending ? (
          <span className="flex items-center gap-1.5">
            <Spinner size="sm" label="Processing" />
            <span className="text-amber-700 font-medium">{balance.pending} pending</span>
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{balance.unit}</td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-400">
        {new Date(balance.asOf).toLocaleTimeString()}
      </td>
    </tr>
  );
}
