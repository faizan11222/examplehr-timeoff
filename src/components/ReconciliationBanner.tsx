'use client';

import { Alert } from './ui/Alert';
import { useRequestStore } from '@/stores/requestStore';

export function ReconciliationBanner() {
  const { banners, dismissBanner } = useRequestStore();

  if (banners.length === 0) return null;

  return (
    <div className="space-y-2" aria-live="polite">
      {banners.map((banner) => (
        <Alert
          key={banner.id}
          variant="warning"
          title="Balance updated"
          onDismiss={() => dismissBanner(banner.id)}
        >
          Your balance for this location changed from{' '}
          <strong>{banner.previousAvailable}</strong> to{' '}
          <strong>{banner.newAvailable}</strong> day
          {banner.newAvailable !== 1 ? 's' : ''} available
          {banner.reason === 'anniversary-bonus' ? ' (anniversary bonus applied)' : ''}.
        </Alert>
      ))}
    </div>
  );
}
