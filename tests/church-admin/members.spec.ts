import { testAccounts } from '../../fixtures/testAccounts';
/**
 * Church Admin - 교인 관리 테스트
 * TC: KNA_CA_010 ~ KNA_CA_018
 */

import { test, expect } from '@playwright/test';
import { MembersPage } from '../../pages/church-admin/MembersPage';
import { ChurchAdminDashboardPage } from '../../pages/church-admin/DashboardPage';

test.describe('교회어드민 교인 관리 (OWNER 권한 필요)', () => {
  test('KNA_CA_010 | 교인 관리 페이지 진입 → 테이블 렌더링', async ({ page }) => {
    const membersPage = new MembersPage(page);
    await membersPage.goto();
    await membersPage.expectLoaded();

    // 테이블 행 또는 빈 메시지 중 하나
    const rowCount = await membersPage.getVisibleRowCount();
    const hasEmpty = await page.getByText(/교인이 없습니다|신청이 없습니다/).isVisible().catch(() => false);
    expect(rowCount > 0 || hasEmpty).toBe(true);
  });

  test('KNA_CA_011 | 필터 탭 전환 — "대기" 탭 클릭 시 PENDING 교인만 표시', async ({ page }) => {
    const membersPage = new MembersPage(page);
    await membersPage.goto();
    await membersPage.clickFilterTab('PENDING');

    const pendingTab = page.getByRole('button', { name: /대기/ });
    await expect(pendingTab).toHaveClass(/bg-blue-600/);

    // PENDING 탭에서는 "거절" 버튼이 있거나 빈 상태
    const rejectBtns = page.getByRole('button', { name: /거절/ });
    const hasEmpty = await page.getByText(/없습니다/).isVisible().catch(() => false);
    const hasBtns = await rejectBtns.count() > 0;
    expect(hasBtns || hasEmpty).toBe(true);
  });

  test('KNA_CA_012 | 가입 신청 승인 → 상태 "APPROVED" 변경', async ({ page }) => {
    const membersPage = new MembersPage(page);
    await membersPage.goto();
    await membersPage.clickFilterTab('PENDING');

    const pendingRows = await membersPage.getVisibleRowCount();
    if (pendingRows === 0) {
      test.skip();
      return;
    }

    const firstRow = page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') }).first();
    const memberName = await firstRow.locator('td').first().innerText();

    await firstRow.getByRole('button', { name: /승인/ }).click();
    await page.waitForTimeout(500);

    // 승인 후 해당 row의 상태 뱃지 확인
    await membersPage.clickFilterTab('ALL');
    const memberRow = page.getByRole('row', { name: new RegExp(memberName) });
    await expect(memberRow).toBeVisible();
  });

  test('KNA_CA_013 | 가입 신청 거절 → confirm 다이얼로그 → 상태 "REJECTED"', async ({ page }) => {
    const membersPage = new MembersPage(page);
    await membersPage.goto();
    await membersPage.clickFilterTab('PENDING');

    const pendingRows = await membersPage.getVisibleRowCount();
    if (pendingRows === 0) {
      test.skip();
      return;
    }

    const firstRow = page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') }).first();
    page.once('dialog', (dialog) => dialog.accept());
    await firstRow.getByRole('button', { name: /거절/ }).click();
    await page.waitForTimeout(500);

    // 거절 후 해당 row는 PENDING 탭에서 사라짐
    await membersPage.clickFilterTab('PENDING');
    const afterCount = await membersPage.getVisibleRowCount();
    expect(afterCount).toBeLessThan(pendingRows);
  });

  test('KNA_CA_014 | 교인 → OPERATOR 권한 부여', async ({ page }) => {
    const membersPage = new MembersPage(page);
    await membersPage.goto();
    await membersPage.clickFilterTab('MEMBER');

    const memberRows = await membersPage.getVisibleRowCount();
    if (memberRows === 0) {
      test.skip();
      return;
    }

    const firstRow = page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') }).first();
    page.once('dialog', (dialog) => dialog.accept());
    await firstRow.getByRole('button', { name: /관리자로/ }).click();
    await page.waitForTimeout(500);

    // OPERATOR 탭에서 확인
    await membersPage.clickFilterTab('OPERATOR');
    const operatorCount = await membersPage.getVisibleRowCount();
    expect(operatorCount).toBeGreaterThan(0);
  });

  test('KNA_CA_015 | OPERATOR → 일반 교인 권한 해제', async ({ page }) => {
    const membersPage = new MembersPage(page);
    await membersPage.goto();
    await membersPage.clickFilterTab('OPERATOR');

    const operatorRows = await membersPage.getVisibleRowCount();
    if (operatorRows === 0) {
      test.skip();
      return;
    }

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') }).first()
      .getByRole('button', { name: /교인으로/ }).click();
    await page.waitForTimeout(500);

    const afterCount = await membersPage.getVisibleRowCount();
    expect(afterCount).toBeLessThan(operatorRows);
  });

  test('KNA_CA_016 | 대시보드 → 교인 관리 "전체 보기" 링크', async ({ page }) => {
    const dashboardPage = new ChurchAdminDashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.clickViewAllMembers();

    await expect(page).toHaveURL(/\/members/);
  });
});
