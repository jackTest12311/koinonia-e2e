import { type Page, type Locator, expect } from '@playwright/test';

export class ChurchesPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly addButton: Locator;
  readonly tableRows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: '교회 관리' });
    this.addButton = page.getByRole('link', { name: /교회 등록/ });
    this.tableRows = page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') });
  }

  async goto() {
    await this.page.goto('/churches');
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
  }

  async clickAddChurch() {
    await this.addButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async fillNewChurchForm(data: {
    churchName: string;
    churchCode: string;
    ownerName: string;
    ownerEmail: string;
    ownerPassword: string;
  }) {
    await this.page.getByLabel('교회명').or(this.page.getByPlaceholder('○○교회')).fill(data.churchName);
    await this.page.getByLabel('교회 코드').or(this.page.getByPlaceholder(/CHURCH_CODE/)).fill(data.churchCode);
    await this.page.getByLabel('이름').or(this.page.getByPlaceholder('홍길동')).fill(data.ownerName);
    await this.page.getByLabel('이메일').or(this.page.getByPlaceholder(/owner@/)).fill(data.ownerEmail);
    await this.page.getByLabel('초기 비밀번호').or(this.page.getByPlaceholder('8자 이상')).fill(data.ownerPassword);
  }

  async submitNewChurch() {
    await this.page.getByRole('button', { name: '교회 등록' }).click();
  }

  async clickChurchDetail(churchName: string) {
    const row = this.page.getByRole('row', { name: new RegExp(churchName) });
    await row.getByRole('link', { name: '상세' }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async getChurchStatus(churchName: string): Promise<string> {
    const row = this.page.getByRole('row', { name: new RegExp(churchName) });
    return await row.locator('[class*="rounded-full"]').innerText();
  }

  // 교회 상세 페이지에서 활성/정지 토글
  async toggleChurchStatus() {
    const btn = this.page.getByRole('button', { name: /교회 정지|교회 활성화/ });
    await btn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async expectChurchDetailLoaded(churchName: string) {
    await expect(this.page.getByRole('heading', { name: new RegExp(churchName) })).toBeVisible();
  }

  // 교회 삭제 버튼 클릭 → 확인 모달 표시
  async clickDeleteChurch() {
    await this.page.getByRole('button', { name: '교회 삭제' }).click();
  }

  // 삭제 확인 모달에서 확인 클릭
  async confirmDelete() {
    await this.page.getByRole('button', { name: '확인' }).click();
    await this.page.waitForLoadState('networkidle');
  }

  // 삭제 확인 모달에서 취소 클릭
  async cancelDelete() {
    await this.page.getByRole('button', { name: '취소' }).click();
  }

  async expectDeleteConfirmVisible() {
    await expect(this.page.getByText('정말 삭제하시겠습니까?')).toBeVisible();
  }

  async expectSystemChurchNotInList() {
    const systemRow = this.page.getByRole('row', { name: /시스템 교회/ });
    await expect(systemRow).not.toBeVisible();
  }
}
