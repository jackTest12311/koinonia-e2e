/**
 * Church Admin - 교인 관리 테스트
 * TC: KNA_CA_010 ~ KNA_CA_018
 */

import { test, expect } from '@playwright/test';
import { MembersPage } from '../../pages/church-admin/MembersPage';
import { ChurchAdminDashboardPage } from '../../pages/church-admin/DashboardPage';
import { createTestMember, deleteTestMember } from '../../fixtures/supabaseAdmin';

test.describe.configure({ mode: 'serial' });

// ─── API 데이터 보장 — CA_012~015 ────────────────────────────────────
test.describe('교회어드민 교인 관리 — 승인/권한 (API 데이터 보장)', () => {
  const churchCode = process.env.TEST_CHURCH_CODE ?? 'TEST_CHURCH';
  let pendingMember1: { userId: string };
  let pendingMember2: { userId: string };
  let approvedMember: { userId: string };

  test.beforeAll(async () => {
    // 동시 createUser 시 Supabase DB 에러 방지 → 순차 생성
    pendingMember1 = await createTestMember(churchCode, 'PENDING');
    pendingMember2 = await createTestMember(churchCode, 'PENDING');
    approvedMember = await createTestMember(churchCode, 'APPROVED', 'MEMBER');
  });

  test.afterAll(async () => {
    await Promise.all([
      deleteTestMember(pendingMember1.userId).catch(() => {}),
      deleteTestMember(pendingMember2.userId).catch(() => {}),
      deleteTestMember(approvedMember.userId).catch(() => {}),
    ]);
  });

  test('KNA_CA_012 | 가입 신청 승인 → 상태 "APPROVED" 변경', async ({ page }) => {
    const membersPage = new MembersPage(page);
    await membersPage.goto();
    await membersPage.clickFilterTab('PENDING');

    const pendingRows = await membersPage.getVisibleRowCount();
    expect(pendingRows).toBeGreaterThan(0);

    const firstRow = page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') }).first();
    const memberName = await firstRow.locator('td').first().innerText();

    await firstRow.getByRole('button', { name: /승인/ }).click();
    await page.waitForTimeout(500);

    await membersPage.clickFilterTab('ALL');
    await expect(page.getByRole('row', { name: new RegExp(memberName) })).toBeVisible();
  });

  test('KNA_CA_013 | 가입 신청 거절 → confirm 다이얼로그 → 상태 "REJECTED"', async ({ page }) => {
    const membersPage = new MembersPage(page);
    await membersPage.goto();
    await membersPage.clickFilterTab('PENDING');

    const pendingRows = await membersPage.getVisibleRowCount();
    expect(pendingRows).toBeGreaterThan(0);

    const firstRow = page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') }).first();
    page.once('dialog', (dialog) => dialog.accept());
    await firstRow.getByRole('button', { name: /거절/ }).click();
    await page.waitForTimeout(500);

    await membersPage.clickFilterTab('PENDING');
    const afterCount = await membersPage.getVisibleRowCount();
    expect(afterCount).toBeLessThan(pendingRows);
  });

  test('KNA_CA_014 | 교인 → OPERATOR 권한 부여', async ({ page }) => {
    const membersPage = new MembersPage(page);
    await membersPage.goto();
    await membersPage.clickFilterTab('MEMBER');

    const memberRows = await membersPage.getVisibleRowCount();
    expect(memberRows).toBeGreaterThan(0);

    const firstRow = page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') }).first();
    page.once('dialog', (dialog) => dialog.accept());
    await firstRow.getByRole('button', { name: /관리자로/ }).click();
    await page.waitForTimeout(500);

    await membersPage.clickFilterTab('OPERATOR');
    const operatorCount = await membersPage.getVisibleRowCount();
    expect(operatorCount).toBeGreaterThan(0);
  });

  test('KNA_CA_015 | OPERATOR → 일반 교인 권한 해제', async ({ page }) => {
    const membersPage = new MembersPage(page);
    await membersPage.goto();
    await membersPage.clickFilterTab('OPERATOR');

    const operatorRows = await membersPage.getVisibleRowCount();
    expect(operatorRows).toBeGreaterThan(0);

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') }).first()
      .getByRole('button', { name: /교인으로/ }).click();
    await page.waitForTimeout(500);

    const afterCount = await membersPage.getVisibleRowCount();
    expect(afterCount).toBeLessThan(operatorRows);
  });
});

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

  test('KNA_CA_016 | 대시보드 → 교인 관리 "전체 보기" 링크', async ({ page }) => {
    const dashboardPage = new ChurchAdminDashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.clickViewAllMembers();

    await expect(page).toHaveURL(/\/members/);
  });
});
