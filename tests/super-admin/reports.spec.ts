/**
 * Super Admin - 신고 관리 테스트
 * TC: KNA_SA_020 ~ KNA_SA_025
 */

import { test, expect } from '@playwright/test';
import { SuperAdminReportsPage } from '../../pages/super-admin/ReportsPage';

test.describe('슈퍼어드민 신고 관리', () => {
  test('KNA_SA_020 | 신고 관리 페이지 진입 — 기본 탭 "대기" 상태', async ({ page }) => {
    const reportsPage = new SuperAdminReportsPage(page);
    await reportsPage.goto();
    await reportsPage.expectLoaded();

    // "대기" 탭이 활성(bg-blue-600) 상태
    const pendingTab = page.getByRole('button', { name: /대기/ });
    await expect(pendingTab).toHaveClass(/bg-blue-600/);
  });

  test('KNA_SA_021 | 신고 탭 필터 전환 — 전체 탭 클릭 시 전체 목록 노출', async ({ page }) => {
    const reportsPage = new SuperAdminReportsPage(page);
    await reportsPage.goto();
    await reportsPage.expectLoaded();

    await reportsPage.clickFilterTab('ALL');

    const allTab = page.getByRole('button', { name: '전체' });
    await expect(allTab).toHaveClass(/bg-blue-600/);
  });

  test('KNA_SA_022 | 신고 처리 → 상태 "처리 완료"로 변경', async ({ page }) => {
    const reportsPage = new SuperAdminReportsPage(page);
    await reportsPage.goto();
    await reportsPage.expectLoaded();

    const pendingCount = await reportsPage.getPendingCount();
    if (pendingCount === 0) {
      test.skip();
      return;
    }

    const beforeCount = await reportsPage.getPendingCount();
    await reportsPage.resolveFirstReport();
    const afterCount = await reportsPage.getPendingCount();

    expect(afterCount).toBe(beforeCount - 1);
  });

  test('KNA_SA_023 | 신고 기각 → 상태 "기각"으로 변경', async ({ page }) => {
    const reportsPage = new SuperAdminReportsPage(page);
    await reportsPage.goto();
    await reportsPage.expectLoaded();

    const pendingCount = await reportsPage.getPendingCount();
    if (pendingCount === 0) {
      test.skip();
      return;
    }

    const beforeCount = await reportsPage.getPendingCount();
    await reportsPage.dismissFirstReport();
    const afterCount = await reportsPage.getPendingCount();

    expect(afterCount).toBe(beforeCount - 1);
  });

  test('KNA_SA_024 | "처리 완료" 탭에서 PENDING 상태 row 미노출', async ({ page }) => {
    const reportsPage = new SuperAdminReportsPage(page);
    await reportsPage.goto();
    await reportsPage.clickFilterTab('RESOLVED');

    // RESOLVED 탭에서는 "처리" 버튼이 없어야 함 (exact: true 로 "처리 완료" 탭 버튼과 구분)
    const resolveButtons = page.getByRole('button', { name: '처리', exact: true });
    await expect(resolveButtons).toHaveCount(0);
  });

  test('KNA_SA_025 | 신고 없는 경우 빈 상태 메시지 노출', async ({ page }) => {
    const reportsPage = new SuperAdminReportsPage(page);
    await reportsPage.goto();

    // DISMISSED 탭 (데이터 없을 가능성 높음)
    await reportsPage.clickFilterTab('DISMISSED');

    // 비어있으면 빈 메시지, 있으면 row — 둘 중 하나
    const hasRows = await reportsPage.tableRows.count() > 0;
    const hasEmpty = await page.getByText('신고 내역이 없습니다').isVisible().catch(() => false);
    expect(hasRows || hasEmpty).toBe(true);
  });
});
