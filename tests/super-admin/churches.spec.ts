/**
 * Super Admin - 교회 관리 테스트
 * TC: KNA_SA_010 ~ KNA_SA_022
 */

import { test, expect } from '@playwright/test';
import { SuperAdminDashboardPage } from '../../pages/super-admin/DashboardPage';
import { ChurchesPage } from '../../pages/super-admin/ChurchesPage';

const NEW_CHURCH = {
  churchName: `E2E테스트교회_${Date.now()}`,
  churchCode: `E2E_${Date.now()}`,
  ownerName: '테스트어드민',
  ownerEmail: `e2e_owner_${Date.now()}@test.com`,
  ownerPassword: 'Test1234!@',
};

test.describe('슈퍼어드민 교회 관리', () => {
  test('KNA_SA_010 | 대시보드 통계 카드 4개 렌더링', async ({ page }) => {
    const dashboardPage = new SuperAdminDashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.expectLoaded();

    const cards = page.locator('.grid .bg-white.rounded-xl.border');
    await expect(cards).toHaveCount(4, { timeout: 15000 });
  });

  test('KNA_SA_011 | 대시보드 → 교회 관리 네비게이션', async ({ page }) => {
    const dashboardPage = new SuperAdminDashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.clickNavItem('교회 관리');

    await expect(page).toHaveURL(/\/churches/);
    const churchesPage = new ChurchesPage(page);
    await churchesPage.expectLoaded();
  });

  test('KNA_SA_012 | 교회 목록 페이지 테이블 렌더링', async ({ page }) => {
    const churchesPage = new ChurchesPage(page);
    await churchesPage.goto();
    await churchesPage.expectLoaded();

    // 테이블 또는 빈 상태 메시지 중 하나가 보여야 함
    const hasRows = await churchesPage.tableRows.count() > 0;
    const hasEmpty = await page.getByText('등록된 교회가 없습니다').isVisible().catch(() => false);
    expect(hasRows || hasEmpty).toBe(true);
  });

  test('KNA_SA_013 | 신규 교회 등록 폼 진입', async ({ page }) => {
    const churchesPage = new ChurchesPage(page);
    await churchesPage.goto();
    await churchesPage.clickAddChurch();

    await expect(page).toHaveURL(/\/churches\/new/);
    await expect(page.getByRole('heading', { name: '교회 등록' })).toBeVisible();
  });

  test('KNA_SA_014 | 교회 등록 — 필수 필드 미입력 시 submit 불가', async ({ page }) => {
    await page.goto('/churches/new');
    const submitBtn = page.getByRole('button', { name: '교회 등록' });
    await submitBtn.click();
    // HTML5 validation or error 메시지 확인
    const url = page.url();
    expect(url).toMatch(/\/churches\/new/); // 페이지 이동 없음
  });

  test('KNA_SA_015 | 신규 교회 등록 성공 → 교회 목록으로 이동', async ({ page }) => {
    const churchesPage = new ChurchesPage(page);
    await churchesPage.goto();
    await churchesPage.clickAddChurch();

    await churchesPage.fillNewChurchForm(NEW_CHURCH);
    await churchesPage.submitNewChurch();

    // 성공 시 /churches로 리다이렉트
    await expect(page).toHaveURL(/\/churches/, { timeout: 10000 });
    await expect(page.getByText(NEW_CHURCH.churchName)).toBeVisible({ timeout: 5000 });
  });

  test('KNA_SA_016 | 교회 상세 페이지 진입 → 교인 통계 표시', async ({ page }) => {
    const churchesPage = new ChurchesPage(page);
    await churchesPage.goto();

    // 등록된 교회가 있는 경우 첫 번째 교회 상세로 이동
    const firstDetailLink = page.getByRole('link', { name: '상세' }).first();
    const hasChurch = await firstDetailLink.isVisible().catch(() => false);

    if (!hasChurch) {
      test.skip();
      return;
    }

    await firstDetailLink.click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('승인 교인')).toBeVisible();
    await expect(page.getByText('승인 대기')).toBeVisible();
    await expect(page.getByText('교회 상태 관리')).toBeVisible();
  });

  test('KNA_SA_017 | 교회 정지 처리 → 상태 "정지"로 변경', async ({ page }) => {
    // 먼저 E2E 테스트로 등록한 교회를 찾아서 정지
    await page.goto('/churches');
    await page.waitForLoadState('networkidle');

    const e2eChurchLink = page.getByRole('row', { name: new RegExp(NEW_CHURCH.churchName) })
      .getByRole('link', { name: '상세' });

    const hasChurch = await e2eChurchLink.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasChurch) {
      test.skip();
      return;
    }

    await e2eChurchLink.click();
    await page.waitForLoadState('networkidle');

    // 현재 활성 상태 → 정지
    const toggleBtn = page.getByRole('button', { name: '교회 정지' });
    await toggleBtn.click();

    await expect(page.getByText('정지')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: '교회 활성화' })).toBeVisible();
  });

  test('KNA_SA_018 | 교회 활성화 → 상태 "활성"으로 변경', async ({ page }) => {
    await page.goto('/churches');
    await page.waitForLoadState('networkidle');

    const e2eChurchLink = page.getByRole('row', { name: new RegExp(NEW_CHURCH.churchName) })
      .getByRole('link', { name: '상세' });

    const hasChurch = await e2eChurchLink.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasChurch) {
      test.skip();
      return;
    }

    await e2eChurchLink.click();
    await page.waitForLoadState('networkidle');

    // 정지 상태 → 활성화
    const toggleBtn = page.getByRole('button', { name: '교회 활성화' });
    const isDeactivated = await toggleBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (!isDeactivated) {
      test.skip();
      return;
    }

    await toggleBtn.click();
    await expect(page.getByText('활성')).toBeVisible({ timeout: 5000 });
  });

  test('KNA_SA_019 | 교회 목록에 시스템 교회 미표시', async ({ page }) => {
    const churchesPage = new ChurchesPage(page);
    await churchesPage.goto();
    await churchesPage.expectLoaded();

    // 시스템 교회(is_system=true)는 목록에 노출되지 않아야 함
    await churchesPage.expectSystemChurchNotInList();
  });

  test('KNA_SA_020 | 교회 상세 — 교회 삭제 버튼 표시', async ({ page }) => {
    const churchesPage = new ChurchesPage(page);
    await churchesPage.goto();

    const e2eChurchLink = page.getByRole('row', { name: new RegExp(NEW_CHURCH.churchName) })
      .getByRole('link', { name: '상세' });

    const hasChurch = await e2eChurchLink.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasChurch) {
      test.skip();
      return;
    }

    await e2eChurchLink.click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: '교회 삭제' })).toBeVisible();
  });

  test('KNA_SA_021 | 교회 삭제 취소 → 페이지 유지', async ({ page }) => {
    const churchesPage = new ChurchesPage(page);
    await churchesPage.goto();

    const e2eChurchLink = page.getByRole('row', { name: new RegExp(NEW_CHURCH.churchName) })
      .getByRole('link', { name: '상세' });

    const hasChurch = await e2eChurchLink.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasChurch) {
      test.skip();
      return;
    }

    await e2eChurchLink.click();
    await page.waitForLoadState('networkidle');

    // 삭제 버튼 클릭 → 확인 모달 표시
    await churchesPage.clickDeleteChurch();
    await churchesPage.expectDeleteConfirmVisible();

    // 취소 클릭 → 모달 사라지고 삭제 버튼 복구
    await churchesPage.cancelDelete();
    await expect(page.getByText('정말 삭제하시겠습니까?')).not.toBeVisible();
    await expect(page.getByRole('button', { name: '교회 삭제' })).toBeVisible();
  });

  test('KNA_SA_022 | 교회 삭제 확인 → 목록으로 이동 & 해당 교회 미표시', async ({ page }) => {
    const churchesPage = new ChurchesPage(page);
    await churchesPage.goto();

    const e2eChurchLink = page.getByRole('row', { name: new RegExp(NEW_CHURCH.churchName) })
      .getByRole('link', { name: '상세' });

    const hasChurch = await e2eChurchLink.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasChurch) {
      test.skip();
      return;
    }

    await e2eChurchLink.click();
    await page.waitForLoadState('networkidle');

    await churchesPage.clickDeleteChurch();
    await churchesPage.expectDeleteConfirmVisible();
    await churchesPage.confirmDelete();

    // /churches 로 리다이렉트
    await expect(page).toHaveURL(/\/churches$/, { timeout: 10000 });
    // 삭제된 교회는 목록에서 미표시
    await expect(page.getByRole('row', { name: new RegExp(NEW_CHURCH.churchName) }))
      .not.toBeVisible({ timeout: 5000 });
  });
});
