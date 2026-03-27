import { type Page, type Locator, expect } from '@playwright/test';
import * as path from 'path';

export class BulletinsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly addButton: Locator;
  readonly form: Locator;
  readonly titleInput: Locator;
  readonly weekDateInput: Locator;
  readonly fileInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly bulletinCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: '주보 관리' });
    this.addButton = page.getByRole('button', { name: /주보 업로드|주보 등록|추가/ });
    this.form = page.locator('form');
    this.titleInput = page.getByLabel(/주보 제목|제목/).or(page.locator('form input[type="text"]'));
    this.weekDateInput = page.getByLabel(/주차 날짜|예배 날짜/).or(page.locator('form input[type="date"]'));
    this.fileInput = page.locator('form input[type="file"]');
    this.submitButton = page.locator('form').getByRole('button', { name: /업로드|등록/ });
    this.cancelButton = page.getByRole('button', { name: '취소' });
    this.bulletinCards = page.locator('.bg-white.rounded-xl.border').filter({ hasText: /주보|PDF|IMAGE/ });
  }

  async goto() {
    await this.page.goto('/bulletins');
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
  }

  async openUploadForm() {
    await this.addButton.click();
    await expect(this.form).toBeVisible({ timeout: 3000 });
  }

  async fillBulletinForm(data: { title: string; weekDate: string }) {
    await this.titleInput.fill(data.title);
    await this.weekDateInput.fill(data.weekDate);
  }

  async attachPDF(filePath: string) {
    await this.fileInput.setInputFiles(filePath);
  }

  async attachImages(filePaths: string[]) {
    await this.fileInput.setInputFiles(filePaths);
  }

  async submitUpload() {
    await this.submitButton.click();
  }

  async cancelUpload() {
    await this.cancelButton.click();
  }

  async deleteBulletin(title: string) {
    const card = this.page.locator('[class*="border"]', { hasText: title });
    this.page.once('dialog', (dialog) => dialog.accept());
    await card.getByRole('button', { name: /삭제/ }).click();
    await this.page.waitForTimeout(500);
  }

  async expectBulletinVisible(title: string) {
    await expect(this.page.getByText(title)).toBeVisible();
  }

  async getBulletinType(title: string): Promise<string> {
    const card = this.page.locator('[class*="border"]', { hasText: title });
    return await card.locator('[class*="rounded"]', { hasText: /PDF|IMAGE/ }).innerText();
  }

  async expectFileTypeLabel(type: 'PDF' | 'IMAGE' | 'IMAGE_MULTI') {
    await expect(this.page.getByText(type)).toBeVisible();
  }
}
