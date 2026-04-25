import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useEffect } from 'react';
import { ReconciliationBanner } from '@/components/ReconciliationBanner';
import { useRequestStore } from '@/stores/requestStore';

const meta: Meta = {
  title: 'ExampleHR/ReconciliationBanner',
  component: ReconciliationBanner,
};
export default meta;

function BannerWithState({
  previousAvailable,
  newAvailable,
  reason,
}: {
  previousAvailable: number;
  newAvailable: number;
  reason: 'anniversary-bonus' | 'background-refresh' | 'manager-decision';
}) {
  const addBanner = useRequestStore((s) => s.addBanner);
  const banners = useRequestStore((s) => s.banners);

  useEffect(() => {
    if (banners.length === 0) {
      addBanner({
        employeeId: 'emp-001',
        locationId: 'loc-nyc',
        previousAvailable,
        newAvailable,
        reason,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <ReconciliationBanner />;
}

export const AnniversaryBonus: StoryObj = {
  name: 'Balance Refreshed — Anniversary Bonus',
  render: () => (
    <BannerWithState previousAvailable={10} newAvailable={15} reason="anniversary-bonus" />
  ),
};

export const BackgroundRefresh: StoryObj = {
  name: 'Balance Refreshed — Background Sync',
  render: () => (
    <BannerWithState previousAvailable={8} newAvailable={6} reason="background-refresh" />
  ),
};

export const NoBanners: StoryObj = {
  name: 'No Banners (empty)',
  render: () => <ReconciliationBanner />,
};
