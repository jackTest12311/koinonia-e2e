import { type Page, type Locator, expect } from '@playwright/test';

type ReportStatus = 'PENDING' | 'RESOLVED' | 'DISMISSED' | 'ALL';

export class SuperAdminReportsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly tableRows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: '신고 관리' });
    this.tableRows = page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') });
  }

  async goto() {
    await this.page.goto('/reports');
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
  }

  async clickFilterTab(status: ReportStatus) {
    const labelMap: Record<ReportStatus, string | RegExp> = {
      PENDING: /대기/,
      RESOLVED: '처리 완료',
      DISMISSED: '기각',
      ALL: '전체',
    };
    await this.page.getByRole('button', { name: labelMap[status] }).click();
    await this.page.waitForTimeout(300);
  }

  async resolveFirstReport() {
    const resolveBtn = this.tableRows.first().getByRole('button', { name: '처리' });
    await resolveBtn.click();
    await this.page.waitForTimeout(500);
  }

  async dismissFirstReport() {
    const dismissBtn = this.tableRows.first().getByRole('button', { name: '기각' });
    await dismissBtn.click();
    await this.page.waitForTimeout(500);
  }

  async getPendingCount(): Promise<number> {
    const tab = this.page.getByRole('button', { name: /대기 \((\d+)\)/ });
    const text = await tab.innerText();
    const match = text.match(/\((\d+)\)/);
    return match ? parseInt(match[1]) : 0;
  }

  async expectEmptyMessage() {
    await expect(this.page.getByText('신고 내역이 없습니다')).toBeVisible();
  }
}
