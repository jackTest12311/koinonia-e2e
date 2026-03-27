import { type Page, type Locator, expect } from '@playwright/test';

export class ChurchAdminLoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]');
    this.submitButton = page.getByRole('button', { name: /로그인/i });
    this.errorMessage = page.locator('[role="alert"], .text-red-500').first();
    this.forgotPasswordLink = page.getByRole('link', { name: /비밀번호.*찾기|forgot/i });
  }

  async goto() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async expectRedirectToDashboard() {
    await expect(this.page).toHaveURL(/\/$/, { timeout: 15000 });
    // 실제 대시보드가 렌더링될 때까지 대기 (storageState 저장 전 세션 확보)
    await expect(this.page.getByRole('heading', { name: /대시보드/ })).toBeVisible({ timeout: 15000 });
  }

  async expectErrorVisible() {
    await expect(this.errorMessage).toBeVisible({ timeout: 5000 });
  }

  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
    await this.page.waitForLoadState('networkidle');
  }
}
