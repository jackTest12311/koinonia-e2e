/**
 * Super Admin Auth Setup
 * 로그인 상태를 fixtures/super-admin-auth.json에 저장해서
 * 이후 테스트에서 재사용합니다.
 */

import { test as setup } from '@playwright/test';
import { SuperAdminLoginPage } from '../../pages/super-admin/LoginPage';
import { testAccounts } from '../../fixtures/testAccounts';

setup('super-admin 로그인 상태 저장', async ({ page }) => {
  const loginPage = new SuperAdminLoginPage(page);
  await loginPage.goto();

  await loginPage.login(
    testAccounts.superAdmin.email,
    testAccounts.superAdmin.password,
  );

  await loginPage.expectRedirectToDashboard();
  await page.context().storageState({ path: './fixtures/super-admin-auth.json' });
});
