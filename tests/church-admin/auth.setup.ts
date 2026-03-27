/**
 * Church Admin Auth Setup
 * OWNER 계정 로그인 상태를 fixtures/church-admin-auth.json에 저장
 */

import { test as setup } from '@playwright/test';
import { ChurchAdminLoginPage } from '../../pages/church-admin/LoginPage';
import { testAccounts } from '../../fixtures/testAccounts';

setup('church-admin OWNER 로그인 상태 저장', async ({ page }) => {
  const loginPage = new ChurchAdminLoginPage(page);
  await loginPage.goto();

  await loginPage.login(
    testAccounts.churchOwner.email,
    testAccounts.churchOwner.password,
  );

  await loginPage.expectRedirectToDashboard();
  await page.context().storageState({ path: './fixtures/church-admin-auth.json' });
});
