import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StaleIndicator } from '@/components/StaleIndicator';

const meta: Meta<typeof StaleIndicator> = {
  title: 'ExampleHR/StaleIndicator',
  component: StaleIndicator,
};
export default meta;
type Story = StoryObj<typeof StaleIndicator>;

export const Fresh: Story = {
  name: 'Fresh (under 5 minutes) — no indicator shown',
  args: { asOf: new Date().toISOString() },
};

export const Stale: Story = {
  name: 'Stale (8 minutes old) — badge visible',
  args: { asOf: new Date(Date.now() - 8 * 60 * 1000).toISOString() },
};

export const VeryStale: Story = {
  name: 'Very Stale (45 minutes old)',
  args: { asOf: new Date(Date.now() - 45 * 60 * 1000).toISOString() },
};
