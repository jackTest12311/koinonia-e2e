import { type Page, type Locator, expect } from '@playwright/test';

export class ChurchAdminDashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly churchName: Locator;
  readonly approvedCount: Locator;
  readonly pendingCount: Locator;
  readonly sidebar: Locator;
  readonly latestBulletinSection: Locator;
  readonly recentPendingSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: '대시보드' });
    this.churchName = page.locator('p.text-sm.text-gray-500').first();
    this.approvedCount = page.locator('.bg-white.rounded-xl.border', { hasText: '승인 교인' }).locator('p.text-3xl');
    this.pendingCount = page.locator('.bg-white.rounded-xl.border', { hasText: '승인 대기' }).locator('p.text-3xl');
    this.sidebar = page.locator('aside');
    this.latestBulletinSection = page.locator('.bg-white.rounded-xl.border', { hasText: '최신 주보' });
    this.recentPendingSection = page.locator('.bg-white.rounded-xl.border', { hasText: '최근 가입 신청' });
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoaded() {
    await this.page.waitForLoadState('networkidle');
    await expect(this.heading).toBeVisible({ timeout: 15000 });
  }

  async expectChurchNameVisible(name: string) {
    await expect(this.churchName).toContainText(name);
  }

  async expectSidebarRole(role: 'OWNER' | 'STAFF') {
    const label = role === 'OWNER' ? '계정관리자' : '일반 관리자';
    await expect(this.sidebar.getByText(label)).toBeVisible();
  }

  async clickNavItem(label: string) {
    await this.sidebar.getByRole('link', { name: label }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickViewAllBulletins() {
    await this.latestBulletinSection.getByRole('link', { name: '전체 보기' }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickViewAllMembers() {
    await this.recentPendingSection.getByRole('link', { name: '전체 보기' }).click();
    await this.page.waitForLoadState('networkidle');
  }
}
