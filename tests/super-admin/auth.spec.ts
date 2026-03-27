/**
 * Super Admin - 인증 테스트
 * TC: KNA_SA_001 ~ KNA_SA_005
 */

import { test, expect } from '@playwright/test';
import { SuperAdminLoginPage } from '../../pages/super-admin/LoginPage';
import { SuperAdminDashboardPage } from '../../pages/super-admin/DashboardPage';
import { testAccounts } from '../../fixtures/testAccounts';

test.use({ storageState: { cookies: [], origins: [] } }); // 로그인 상태 초기화

test.describe('슈퍼어드민 인증', () => {
  test('KNA_SA_001 | 올바른 자격증명으로 로그인 성공', async ({ page }) => {
    const loginPage = new SuperAdminLoginPage(page);
    const dashboardPage = new SuperAdminDashboardPage(page);

    await loginPage.goto();
    await loginPage.login(
      testAccounts.superAdmin.email,
      testAccounts.superAdmin.password,
    );

    await loginPage.expectRedirectToDashboard();
    await dashboardPage.expectLoaded();
    await dashboardPage.expectSidebarBrand('Koinonia');
    await dashboardPage.expectSidebarRole('슈퍼어드민');
  });

  test('KNA_SA_002 | 잘못된 비밀번호로 로그인 실패 → 에러 메시지 표시', async ({ page }) => {
    const loginPage = new SuperAdminLoginPage(page);

    await loginPage.goto();
    await loginPage.login(testAccounts.superAdmin.email, 'wrongpassword123');

    await loginPage.expectErrorVisible();
    await expect(page).toHaveURL(/login/);
  });

  test('KNA_SA_003 | 슈퍼어드민이 아닌 계정으로 로그인 시도 → 로그인 페이지로 리다이렉트', async ({ page }) => {
    const loginPage = new SuperAdminLoginPage(page);

    await loginPage.goto();
    await loginPage.login(
      testAccounts.churchOwner.email,
      testAccounts.churchOwner.password,
    );

    // super_admins 테이블에 없으면 /login으로 리다이렉트
    await expect(page).toHaveURL(/login/, { timeout: 8000 });
  });

  test('KNA_SA_004 | 미인증 상태에서 대시보드 접근 → /login 리다이렉트', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/login/, { timeout: 5000 });
  });

  test('KNA_SA_005 | 로그아웃 후 대시보드 접근 차단', async ({ page }) => {
    const loginPage = new SuperAdminLoginPage(page);

    // 로그인
    await loginPage.goto();
    await loginPage.login(
      testAccounts.superAdmin.email,
      testAccounts.superAdmin.password,
    );
    await loginPage.expectRedirectToDashboard();

    // 로그아웃
    await page.getByRole('button', { name: '로그아웃' }).click();
    await expect(page).toHaveURL(/login/, { timeout: 5000 });

    // 다시 대시보드 접근 시도
    await page.goto('/');
    await expect(page).toHaveURL(/login/, { timeout: 5000 });
  });
});
