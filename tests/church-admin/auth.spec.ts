/**
 * Church Admin - 인증 테스트
 * TC: KNA_CA_001 ~ KNA_CA_006
 */

import { test, expect } from '@playwright/test';
import { ChurchAdminLoginPage } from '../../pages/church-admin/LoginPage';
import { ChurchAdminDashboardPage } from '../../pages/church-admin/DashboardPage';
import { testAccounts } from '../../fixtures/testAccounts';
import { createTestStaffAdmin, deleteTestStaffAdmin } from '../../fixtures/supabaseAdmin';

test.use({ storageState: { cookies: [], origins: [] } }); // 인증 초기화

test.describe('교회어드민 인증', () => {
  test('KNA_CA_001 | OWNER 계정 로그인 성공 → 대시보드 이동', async ({ page }) => {
    const loginPage = new ChurchAdminLoginPage(page);
    const dashboardPage = new ChurchAdminDashboardPage(page);

    await loginPage.goto();
    await loginPage.login(
      testAccounts.churchOwner.email,
      testAccounts.churchOwner.password,
    );

    await loginPage.expectRedirectToDashboard();
    await dashboardPage.expectLoaded();
  });

  test('KNA_CA_002 | OWNER 사이드바에 교인/스태프/설정 메뉴 표시', async ({ page }) => {
    const loginPage = new ChurchAdminLoginPage(page);
    await loginPage.goto();
    await loginPage.login(
      testAccounts.churchOwner.email,
      testAccounts.churchOwner.password,
    );

    const dashboardPage = new ChurchAdminDashboardPage(page);
    await dashboardPage.expectSidebarRole('OWNER');

    // OWNER 전용 메뉴 확인
    await expect(page.locator('aside').getByRole('link', { name: '교인 관리' })).toBeVisible();
    await expect(page.locator('aside').getByRole('link', { name: '스태프 관리' })).toBeVisible();
    await expect(page.locator('aside').getByRole('link', { name: '교회 설정' })).toBeVisible();
  });

  test('KNA_CA_003 | STAFF 계정 로그인 성공 → 교인/스태프/설정 메뉴 비노출', async ({ page }) => {
    const churchCode = process.env.TEST_CHURCH_CODE ?? 'TEST_CHURCH';

    // env에 STAFF 계정이 없으면 API로 임시 생성
    let staffEmail = testAccounts.churchStaff.email;
    let staffPassword = testAccounts.churchStaff.password;
    let tempStaffId: string | null = null;

    if (!staffEmail || !staffPassword) {
      const staff = await createTestStaffAdmin(churchCode);
      staffEmail = staff.email;
      staffPassword = staff.password;
      tempStaffId = staff.userId;
    }

    try {
      const loginPage = new ChurchAdminLoginPage(page);
      await loginPage.goto();
      await loginPage.login(staffEmail, staffPassword);
      await loginPage.expectRedirectToDashboard();

      const dashboardPage = new ChurchAdminDashboardPage(page);
      await dashboardPage.expectSidebarRole('STAFF');

      await expect(page.locator('aside').getByRole('link', { name: '교인 관리' })).not.toBeVisible();
    } finally {
      if (tempStaffId) await deleteTestStaffAdmin(tempStaffId);
    }
  });

  test('KNA_CA_004 | 잘못된 비밀번호 → 에러 메시지 표시', async ({ page }) => {
    const loginPage = new ChurchAdminLoginPage(page);
    await loginPage.goto();
    await loginPage.login(testAccounts.churchOwner.email, 'wrongpassword');

    await loginPage.expectErrorVisible();
    await expect(page).toHaveURL(/login/);
  });

  test('KNA_CA_005 | 비인증 접근 → /login 리다이렉트', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/login/, { timeout: 5000 });

    await page.goto('/members');
    await expect(page).toHaveURL(/login/, { timeout: 5000 });
  });

  test('KNA_CA_006 | 로그아웃 후 재접근 차단', async ({ page }) => {
    const loginPage = new ChurchAdminLoginPage(page);
    await loginPage.goto();
    await loginPage.login(
      testAccounts.churchOwner.email,
      testAccounts.churchOwner.password,
    );
    await loginPage.expectRedirectToDashboard();

    await page.getByRole('button', { name: '로그아웃' }).click();
    await expect(page).toHaveURL(/login/, { timeout: 5000 });

    await page.goto('/');
    await expect(page).toHaveURL(/login/, { timeout: 5000 });
  });
});
