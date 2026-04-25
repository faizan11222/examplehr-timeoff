'use client';

import { usePendingRequests } from '@/hooks/useRequests';
import { ManagerRequestCard } from '@/components/RequestCard';
import { Spinner } from '@/components/ui/Spinner';

const LOCATION_NAMES: Record<string, string> = {
  'loc-nyc': 'New York',
  'loc-lon': 'London',
  'loc-syd': 'Sydney',
};

export default function ManagerPage() {
  const { data: requests, isLoading, isError, dataUpdatedAt } = usePendingRequests();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
          {dataUpdatedAt > 0 && (
            <p className="text-xs text-gray-400">
              Last refreshed {new Date(dataUpdatedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
        {isLoading && <Spinner />}
      </header>

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load requests. Please refresh.
        </div>
      )}

      {!isLoading && requests?.length === 0 && (
        <div
          data-testid="manager-empty"
          className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500"
        >
          No pending requests at this time.
        </div>
      )}

      <div className="space-y-4" aria-live="polite">
        {requests?.map((req) => (
          <ManagerRequestCard
            key={req.id}
            request={req}
            locationNames={LOCATION_NAMES}
          />
        ))}
      </div>
    </div>
  );
}
