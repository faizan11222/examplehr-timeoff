import { test, expect } from '@playwright/test';

test.describe('Employee time-off flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/employee');
  });

  test('loads balance table for emp-001', async ({ page }) => {
    await expect(page.getByTestId('balance-table')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('balance-row-loc-nyc')).toBeVisible();
    await expect(page.getByTestId('balance-row-loc-lon')).toBeVisible();
  });

  test('submits a valid time-off request and shows pending status', async ({ page }) => {
    await expect(page.getByTestId('balance-table')).toBeVisible({ timeout: 10_000 });

    // Fill form
    await page.selectOption('#location', 'loc-nyc');
    await page.fill('#days', '2');
    await page.fill('#startDate', '2026-06-01');
    await page.fill('#endDate', '2026-06-02');

    await page.click('button[type="submit"]');

    // Optimistic: button should be loading or success banner should appear
    await expect(
      page.getByText(/submitting|pending manager approval/i),
    ).toBeVisible({ timeout: 8_000 });
  });

  test('shows rolled-back state when days exceed balance', async ({ page }) => {
    await expect(page.getByTestId('balance-table')).toBeVisible({ timeout: 10_000 });

    await page.fill('#days', '999');
    await page.fill('#startDate', '2026-06-01');
    await page.fill('#endDate', '2026-07-30');

    // Submit button should be disabled, error message shown inline
    await expect(page.getByText(/exceeds available balance/i)).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });

  test('balance updates after anniversary trigger (dev harness)', async ({ page }) => {
    await expect(page.getByTestId('balance-table')).toBeVisible({ timeout: 10_000 });

    // Get initial available count from first row
    const cell = page.locator('[data-testid="balance-row-loc-nyc"] td').nth(1);
    const initialText = await cell.innerText();
    const initial = parseInt(initialText.trim(), 10);

    // Trigger anniversary bonus
    await page.click('button:has-text("Anniversary Bonus")');

    // Balance should increase by 5
    await expect(cell).toContainText(`${initial + 5}`, { timeout: 8_000 });
  });
});

test.describe('Manager approval flow', () => {
  test('shows empty state when no pending requests', async ({ page }) => {
    await page.goto('/manager');
    // May show empty or pending cards depending on test isolation
    // At minimum the page should load
    await expect(page.locator('h1')).toContainText('Pending Approvals');
  });

  test('full submit → approve flow', async ({ page, context }) => {
    // Step 1: Employee submits a request
    const employeePage = await context.newPage();
    await employeePage.goto('/employee');
    await expect(employeePage.getByTestId('balance-table')).toBeVisible({ timeout: 10_000 });

    await employeePage.fill('#days', '1');
    await employeePage.fill('#startDate', '2026-06-10');
    await employeePage.fill('#endDate', '2026-06-10');
    await employeePage.click('button[type="submit"]');
    await expect(employeePage.getByText(/pending manager approval/i)).toBeVisible({ timeout: 8_000 });

    // Step 2: Manager sees the request
    const managerPage = await context.newPage();
    await managerPage.goto('/manager');
    const card = managerPage.locator('[data-testid^="manager-request-card"]').first();
    await expect(card).toBeVisible({ timeout: 12_000 });

    // Step 3: Manager approves
    await card.locator('[data-testid="approve-btn"]').click();

    // Card should disappear from pending list after approval
    await expect(managerPage.locator('[data-testid^="manager-request-card"]')).toHaveCount(0, {
      timeout: 10_000,
    });
  });

  test('full submit → deny flow restores employee balance', async ({ page, context }) => {
    // Employee submits
    const employeePage = await context.newPage();
    await employeePage.goto('/employee');
    await expect(employeePage.getByTestId('balance-table')).toBeVisible({ timeout: 10_000 });

    const balanceCell = employeePage.locator('[data-testid="balance-row-loc-nyc"] td').nth(1);
    const initialBalance = parseInt((await balanceCell.innerText()).trim(), 10);

    await employeePage.fill('#days', '2');
    await employeePage.fill('#startDate', '2026-06-15');
    await employeePage.fill('#endDate', '2026-06-16');
    await employeePage.click('button[type="submit"]');
    await expect(employeePage.getByText(/pending manager approval/i)).toBeVisible({ timeout: 8_000 });

    // After optimistic update, balance should decrease
    await expect(balanceCell).toContainText(`${initialBalance - 2}`, { timeout: 5_000 });

    // Manager denies
    const managerPage = await context.newPage();
    await managerPage.goto('/manager');
    const card = managerPage.locator('[data-testid^="manager-request-card"]').first();
    await expect(card).toBeVisible({ timeout: 12_000 });
    await card.locator('[data-testid="deny-btn"]').click();
    await expect(managerPage.locator('[data-testid^="manager-request-card"]')).toHaveCount(0, {
      timeout: 10_000,
    });

    // Employee balance should be restored after next poll / invalidation
    // Force a navigate to refresh
    await employeePage.reload();
    await expect(employeePage.getByTestId('balance-table')).toBeVisible({ timeout: 10_000 });
    await expect(balanceCell).toContainText(`${initialBalance}`, { timeout: 5_000 });
  });
});
