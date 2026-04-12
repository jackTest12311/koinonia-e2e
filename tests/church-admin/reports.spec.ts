/**
 * Church Admin - 신고 관리 테스트
 * TC: KNA_CA_030 ~ KNA_CA_037
 *
 * 교회어드민은 자기 교회 신고만 조회 가능 (church_id 필터)
 */

import { test, expect } from '@playwright/test';
import { ChurchAdminReportsPage } from '../../pages/church-admin/ReportsPage';
import { createTestReportData, deleteTestReportData, cleanupE2EReportData } from '../../fixtures/supabaseAdmin';

// ─── UI 기본 테스트 ───────────────────────────────────────────────
test.describe('교회어드민 신고 관리 — UI', () => {
  test('KNA_CA_030 | 신고 관리 페이지 진입 — 헤딩 노출', async ({ page }) => {
    const reportsPage = new ChurchAdminReportsPage(page);
    await reportsPage.goto();
    await reportsPage.expectLoaded();
  });

  test('KNA_CA_031 | 기본 탭 "대기" 활성 상태', async ({ page }) => {
    const reportsPage = new ChurchAdminReportsPage(page);
    await reportsPage.goto();
    await reportsPage.expectLoaded();

    const pendingTab = page.getByRole('button', { name: /대기/ });
    await expect(pendingTab).toHaveClass(/bg-blue-600/);
  });

  test('KNA_CA_032 | 탭 필터 전환 — 처리 완료 탭 클릭', async ({ page }) => {
    const reportsPage = new ChurchAdminReportsPage(page);
    await reportsPage.goto();
    await reportsPage.clickFilterTab('RESOLVED');

    const resolvedTab = page.getByRole('button', { name: '처리 완료' });
    await expect(resolvedTab).toHaveClass(/bg-blue-600/);
  });

  test('KNA_CA_033 | RESOLVED 탭에서 "처리" 버튼 미노출', async ({ page }) => {
    const reportsPage = new ChurchAdminReportsPage(page);
    await reportsPage.goto();
    await reportsPage.clickFilterTab('RESOLVED');

    const resolveButtons = page.getByRole('button', { name: '처리', exact: true });
    await expect(resolveButtons).toHaveCount(0);
  });
});

// ─── API 기반 — 데이터 보장 테스트 ────────────────────────────────
test.describe('교회어드민 신고 관리 (API 데이터 보장)', () => {
  let testData: Awaited<ReturnType<typeof createTestReportData>>;

  test.beforeAll(async () => {
    const churchCode = process.env.TEST_CHURCH_CODE ?? 'TEST_CHURCH';
    await cleanupE2EReportData(churchCode);
    testData = await createTestReportData(churchCode);
  });

  test.afterAll(async () => {
    if (testData) await deleteTestReportData(testData);
  });

  test('KNA_CA_034 | 자기 교회 신고글 내용이 목록에 노출됨', async ({ page }) => {
    const reportsPage = new ChurchAdminReportsPage(page);
    await reportsPage.goto();
    await reportsPage.expectLoaded();
    await reportsPage.clickFilterTab('PENDING');

    await reportsPage.expectReportVisible('[E2E] 신고 테스트용 게시글');
  });

  test('KNA_CA_035 | 신고 행 클릭 시 게시글 내용 펼쳐짐', async ({ page }) => {
    const reportsPage = new ChurchAdminReportsPage(page);
    await reportsPage.goto();
    await reportsPage.clickFilterTab('PENDING');

    // 첫 번째 신고 행 클릭 → 상세 내용 토글 (펼쳐진 본문은 whitespace-pre-wrap 클래스)
    await reportsPage.tableRows.first().click();
    await expect(page.locator('.whitespace-pre-wrap').filter({ hasText: '이 글은 E2E 테스트를 위해 자동 생성된 게시글입니다.' })).toBeVisible();
  });

  test('KNA_CA_036 | 신고 처리 → PENDING 카운트 감소', async ({ page }) => {
    const reportsPage = new ChurchAdminReportsPage(page);
    await reportsPage.goto();
    await reportsPage.clickFilterTab('PENDING');

    const before = await reportsPage.getPendingCount();
    await reportsPage.resolveFirstReport();
    const after = await reportsPage.getPendingCount();

    expect(after).toBe(before - 1);
  });

  test('KNA_CA_037 | 신고 기각 → DISMISSED 탭에 노출', async ({ page }) => {
    const churchCode = process.env.TEST_CHURCH_CODE ?? 'TEST_CHURCH';
    const extraData = await createTestReportData(churchCode);

    const reportsPage = new ChurchAdminReportsPage(page);
    await reportsPage.goto();
    await reportsPage.clickFilterTab('PENDING');
    await reportsPage.dismissFirstReport();

    await reportsPage.clickFilterTab('DISMISSED');
    const after = await reportsPage.getRowCount();
    expect(after).toBeGreaterThan(0);

    await deleteTestReportData(extraData);
  });
});
