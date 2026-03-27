import { type Page, type Locator, expect } from '@playwright/test';

type FilterTab = 'ALL' | 'PENDING' | 'MEMBER' | 'OPERATOR' | 'ADMIN';

export class MembersPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly tableRows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: '교인 관리' });
    this.tableRows = page.getByRole('row')
      .filter({ hasNot: page.getByRole('columnheader') })
      .filter({ hasNot: page.getByText(/없습니다/) });
  }

  async goto() {
    await this.page.goto('/members');
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
  }

  async clickFilterTab(tab: FilterTab) {
    const labelMap: Record<FilterTab, string> = {
      ALL: '전체',
      PENDING: '승인 대기',
      MEMBER: '일반교인',
      OPERATOR: '관리자',
      ADMIN: '계정관리자',
    };
    const label = labelMap[tab];
    // 필터 컨테이너에서만 탭 버튼 찾기 (행 내 액션 버튼과 구분)
    const filterContainer = this.page.locator('.flex.gap-2.mb-4');
    await filterContainer.getByRole('button', { name: new RegExp(`^${label}`) }).click();
    await this.page.waitForTimeout(300);
  }

  async approveMember(memberName: string) {
    const row = this.page.getByRole('row', { name: new RegExp(memberName) });
    await row.getByRole('button', { name: /승인/ }).click();
    await this.page.waitForTimeout(500);
  }

  async rejectMember(memberName: string) {
    const row = this.page.getByRole('row', { name: new RegExp(memberName) });
    this.page.once('dialog', (dialog) => dialog.accept());
    await row.getByRole('button', { name: /거절/ }).click();
    await this.page.waitForTimeout(500);
  }

  async toggleOperatorRole(memberName: string) {
    const row = this.page.getByRole('row', { name: new RegExp(memberName) });
    this.page.once('dialog', (dialog) => dialog.accept());
    await row.getByRole('button', { name: /OPERATOR|관리자|교인으로/ }).click();
    await this.page.waitForTimeout(500);
  }

  async getMemberRole(memberName: string): Promise<string> {
    const row = this.page.getByRole('row', { name: new RegExp(memberName) });
    return await row.locator('[class*="rounded-full"]').first().innerText();
  }

  async getMemberStatus(memberName: string): Promise<string> {
    const row = this.page.getByRole('row', { name: new RegExp(memberName) });
    const badges = row.locator('[class*="rounded-full"]');
    return await badges.last().innerText();
  }

  async expectEmptyMessage() {
    await expect(this.page.getByText(/교인이 없습니다|신청이 없습니다/)).toBeVisible();
  }

  async getVisibleRowCount(): Promise<number> {
    return await this.tableRows.count();
  }
}
