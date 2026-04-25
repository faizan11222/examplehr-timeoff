'use client';

import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Spinner } from './ui/Spinner';
import { useSingleBalance } from '@/hooks/useBalances';
import { useDecideRequest } from '@/hooks/useDecideRequest';
import type { TimeOffRequest } from '@/types';

const statusConfig: Record<
  TimeOffRequest['status'],
  { label: string; badge: 'info' | 'warning' | 'success' | 'danger' | 'muted' | 'default' }
> = {
  'optimistic-pending': { label: 'Submitting…', badge: 'info' },
  pending: { label: 'Pending approval', badge: 'warning' },
  approved: { label: 'Approved', badge: 'success' },
  denied: { label: 'Denied', badge: 'danger' },
  'rolled-back': { label: 'Not submitted', badge: 'danger' },
  'hcm-conflict': { label: 'Conflict — please resubmit', badge: 'danger' },
};

/** Employee-facing request card — read-only status display. */
export function RequestCard({ request, locationNames = {} }: {
  request: TimeOffRequest;
  locationNames?: Record<string, string>;
}) {
  const { label, badge } = statusConfig[request.status];

  return (
    <div
      data-testid={`request-card-${request.id}`}
      className={`rounded-lg border bg-white p-4 space-y-2 ${request.status === 'rolled-back' ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-900">
          {request.days} day{request.days !== 1 ? 's' : ''} —{' '}
          {locationNames[request.locationId] ?? request.locationId}
        </div>
        <Badge variant={badge}>
          {request.status === 'optimistic-pending' && <Spinner size="sm" />}
          {label}
        </Badge>
      </div>
      <div className="text-xs text-gray-500">
        {new Date(request.startDate).toLocaleDateString()} –{' '}
        {new Date(request.endDate).toLocaleDateString()}
      </div>
      {request.note && <div className="text-xs text-gray-600">{request.note}</div>}
      {request.decisionNote && (
        <div className="text-xs text-gray-500 italic">Note: {request.decisionNote}</div>
      )}
    </div>
  );
}

/** Manager-facing request card — shows live balance and approve/deny actions. */
export function ManagerRequestCard({
  request,
  locationNames = {},
}: {
  request: TimeOffRequest;
  locationNames?: Record<string, string>;
}) {
  const { data: liveBalance, isLoading: balanceLoading } = useSingleBalance(
    request.employeeId,
    request.locationId,
  );
  const decide = useDecideRequest();

  const canDecide = request.status === 'pending' && !decide.isPending;
  const locationLabel = locationNames[request.locationId] ?? request.locationId;

  function handleApprove() {
    decide.mutate({
      id: request.id,
      employeeId: request.employeeId,
      locationId: request.locationId,
      decision: 'approved',
    });
  }

  function handleDeny() {
    decide.mutate({
      id: request.id,
      employeeId: request.employeeId,
      locationId: request.locationId,
      decision: 'denied',
    });
  }

  const { label, badge } = statusConfig[request.status];

  return (
    <div
      data-testid={`manager-request-card-${request.id}`}
      className="rounded-lg border border-gray-200 bg-white p-5 space-y-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {request.employeeId} — {request.days} day{request.days !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-gray-500">
            {new Date(request.startDate).toLocaleDateString()} –{' '}
            {new Date(request.endDate).toLocaleDateString()} · {locationLabel}
          </p>
          {request.note && <p className="mt-1 text-xs text-gray-600">{request.note}</p>}
        </div>
        <Badge variant={badge}>{label}</Badge>
      </div>

      {/* Live balance section */}
      <div className="rounded-md bg-gray-50 px-4 py-3 text-sm">
        <span className="text-gray-500">Current balance at decision time: </span>
        {balanceLoading ? (
          <Spinner size="sm" />
        ) : liveBalance ? (
          <strong className="text-gray-900">
            {liveBalance.available} days available
          </strong>
        ) : (
          <span className="text-red-600">Unable to fetch live balance</span>
        )}
      </div>

      {decide.isError && (
        <p className="text-xs text-red-600">
          Decision failed — please try again.
        </p>
      )}

      {canDecide && (
        <div className="flex gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={handleApprove}
            loading={decide.isPending}
            data-testid="approve-btn"
          >
            Approve
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDeny}
            loading={decide.isPending}
            data-testid="deny-btn"
          >
            Deny
          </Button>
        </div>
      )}

      {(request.status === 'approved' || request.status === 'denied') && (
        <p className="text-xs text-gray-500">
          {request.status === 'approved' ? 'Approved' : 'Denied'} on{' '}
          {request.decidedAt ? new Date(request.decidedAt).toLocaleString() : '—'}
        </p>
      )}
    </div>
  );
}
