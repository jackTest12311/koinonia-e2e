import { type Page, type Locator, expect } from '@playwright/test';

export class SuperAdminDashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly statCards: Locator;
  readonly recentChurchesTable: Locator;
  readonly sidebar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: '대시보드' });
    this.statCards = page.locator('.grid .bg-white.rounded-xl.border');
    this.recentChurchesTable = page.getByRole('table');
    this.sidebar = page.locator('aside');
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoaded() {
    await this.page.waitForLoadState('networkidle');
    await expect(this.heading).toBeVisible({ timeout: 15000 });
    await expect(this.statCards.first()).toBeVisible({ timeout: 15000 });
  }

  async expectSidebarBrand(brand: string) {
    await expect(this.sidebar.getByText(brand)).toBeVisible();
  }

  async expectSidebarRole(roleText: string) {
    await expect(this.sidebar.getByText(roleText)).toBeVisible();
  }

  async getStatValue(label: string): Promise<string> {
    const card = this.page.locator('.bg-white.rounded-xl.border', { hasText: label });
    const value = card.locator('p.text-3xl');
    return await value.innerText();
  }

  async clickNavItem(label: string) {
    await this.sidebar.getByRole('link', { name: label }).click();
    await this.page.waitForLoadState('networkidle');
  }
}
