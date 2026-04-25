'use client';

import { useState } from 'react';
import { useBalances } from '@/hooks/useBalances';
import { useEmployeeRequests } from '@/hooks/useRequests';
import { useSubmitRequest } from '@/hooks/useSubmitRequest';
import { useAnniversaryTrigger } from '@/hooks/useAnniversaryTrigger';
import { BalanceTable } from '@/components/BalanceTable';
import { RequestForm } from '@/components/RequestForm';
import { RequestCard } from '@/components/RequestCard';
import { ReconciliationBanner } from '@/components/ReconciliationBanner';
import { Button } from '@/components/ui/Button';
import type { TimeOffRequest } from '@/types';

// Demo: fixed employee — in a real app this comes from auth session
const EMPLOYEE_ID = 'emp-001';
const LOCATION_NAMES: Record<string, string> = {
  'loc-nyc': 'New York',
  'loc-lon': 'London',
  'loc-syd': 'Sydney',
};

export default function EmployeePage() {
  const balancesQuery = useBalances(EMPLOYEE_ID);
  const requestsQuery = useEmployeeRequests(EMPLOYEE_ID);
  const submitMutation = useSubmitRequest(EMPLOYEE_ID);
  const anniversaryTrigger = useAnniversaryTrigger(EMPLOYEE_ID);
  const [lastRequestStatus, setLastRequestStatus] = useState<
    TimeOffRequest['status'] | null
  >(null);

  function handleSubmit(payload: Parameters<typeof submitMutation.mutate>[0]) {
    setLastRequestStatus('optimistic-pending');
    submitMutation.mutate(payload, {
      onSuccess: (data) => {
        const sf = (data as { _silentFailure?: boolean })._silentFailure;
        setLastRequestStatus(sf ? 'rolled-back' : 'pending');
      },
      onError: () => setLastRequestStatus('rolled-back'),
    });
  }

  const requests = requestsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Time Off</h1>
          <p className="text-sm text-gray-500">Employee: Alice Johnson (emp-001)</p>
        </div>
        {/* Test-harness trigger — visible in dev only */}
        {process.env.NODE_ENV !== 'production' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => anniversaryTrigger.mutate(5)}
            loading={anniversaryTrigger.isPending}
            title="Dev: simulate anniversary bonus"
          >
            + Anniversary Bonus
          </Button>
        )}
      </header>

      <ReconciliationBanner />

      <section aria-labelledby="balances-heading">
        <h2 id="balances-heading" className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Leave Balances
        </h2>
        <BalanceTable
          balances={balancesQuery.data}
          isLoading={balancesQuery.isLoading}
          isError={balancesQuery.isError}
          locationNames={LOCATION_NAMES}
        />
      </section>

      <section aria-labelledby="request-heading">
        <h2 id="request-heading" className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          New Request
        </h2>
        {balancesQuery.data && balancesQuery.data.length > 0 && (
          <RequestForm
            employeeId={EMPLOYEE_ID}
            balances={balancesQuery.data}
            onSubmit={handleSubmit}
            isSubmitting={submitMutation.isPending}
            submitError={submitMutation.error}
            lastSubmitStatus={
              lastRequestStatus === 'optimistic-pending' ||
              lastRequestStatus === 'rolled-back' ||
              lastRequestStatus === 'pending'
                ? lastRequestStatus
                : null
            }
            locationNames={LOCATION_NAMES}
          />
        )}
      </section>

      {requests.length > 0 && (
        <section aria-labelledby="history-heading">
          <h2 id="history-heading" className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Request History
          </h2>
          <div className="space-y-3">
            {[...requests].reverse().map((req) => (
              <RequestCard key={req.id} request={req} locationNames={LOCATION_NAMES} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
