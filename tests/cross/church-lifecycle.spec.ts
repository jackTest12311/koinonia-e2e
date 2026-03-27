/**
 * 크로스앱 통합 테스트 — 교회 라이프사이클
 * TC: KNA_CROSS_001
 *
 * 슈퍼어드민에서 교회 생성 → 교회어드민 로그인 성공
 * → 슈퍼어드민에서 교회 삭제 → 교회어드민 재로그인 실패 검증
 *
 * - 슈퍼어드민: super-admin-setup storageState 사용 (이미 로그인된 상태)
 * - 교회어드민: 동일 브라우저 컨텍스트에서 다른 도메인으로 이동 (쿠키 분리)
 * - 교회 코드에 실행 ID를 붙여 매 실행마다 유니크하게 생성
 * - 테스트 후 생성한 교회 + Auth 유저를 Admin API로 정리
 */

import { test, expect } from '@playwright/test';
import { deleteAuthUser, deleteTestChurch } from '../../fixtures/supabaseAdmin';

const SUPER_ADMIN_URL = process.env.SUPER_ADMIN_URL ?? 'http://localhost:3001';
const CHURCH_ADMIN_URL = process.env.CHURCH_ADMIN_URL ?? 'http://localhost:3000';

// 매 실행마다 유니크한 교회 코드 (재실행 시 중복 코드 에러 방지)
const RUN_ID = Date.now().toString().slice(-6);
const LIFECYCLE_CHURCH = {
  churchName: `라이프사이클테스트`,
  churchCode: `LCT${RUN_ID}`,
  ownerName: '테스트어드민',
  ownerEmail: `lifecycle-${RUN_ID}@churchnote.app`,
  ownerPassword: 'TestLife1234!',
};

test.describe('교회 라이프사이클 통합 테스트', () => {
  test.afterAll(async () => {
    // 테스트 데이터 정리
    await deleteTestChurch(LIFECYCLE_CHURCH.churchCode);
    await deleteAuthUser(LIFECYCLE_CHURCH.ownerEmail);
  });

  test('KNA_CROSS_001 | 교회 생성 → 어드민 로그인 성공 → 교회 삭제 → 재로그인 실패', async ({ page }) => {
    // ─── Step 1: 슈퍼어드민에서 교회 등록 ────────────────────────────────
    await page.goto(`${SUPER_ADMIN_URL}/churches/new`);
    await page.waitForLoadState('networkidle');

    await page.getByPlaceholder('○○교회').fill(LIFECYCLE_CHURCH.churchName);
    await page.getByPlaceholder(/CHURCH_CODE/).fill(LIFECYCLE_CHURCH.churchCode);
    await page.getByPlaceholder('홍길동').fill(LIFECYCLE_CHURCH.ownerName);
    await page.getByPlaceholder(/owner@/).fill(LIFECYCLE_CHURCH.ownerEmail);
    await page.locator('input[type="password"]').fill(LIFECYCLE_CHURCH.ownerPassword);
    await page.getByRole('button', { name: '교회 등록' }).click();

    // /churches/new → /churches 로 리다이렉트 대기 (new 포함 URL 제외)
    await page.waitForURL(`${SUPER_ADMIN_URL}/churches`, { timeout: 15000 });
    // 생성한 교회 코드 기준으로 확인 (코드는 유니크하므로 중복 없음)
    await expect(page.getByText(LIFECYCLE_CHURCH.churchCode)).toBeVisible({ timeout: 5000 });

    // ─── Step 2: 교회어드민 로그인 → 성공 ───────────────────────────────
    await page.goto(`${CHURCH_ADMIN_URL}/login`);
    await page.waitForLoadState('networkidle');

    await page.locator('input[type="email"]').fill(LIFECYCLE_CHURCH.ownerEmail);
    await page.locator('input[type="password"]').fill(LIFECYCLE_CHURCH.ownerPassword);
    await page.getByRole('button', { name: /로그인/ }).click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(`${CHURCH_ADMIN_URL}/`, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /대시보드/ })).toBeVisible({ timeout: 10000 });

    // ─── Step 3: 슈퍼어드민에서 교회 삭제 ───────────────────────────────
    await page.goto(`${SUPER_ADMIN_URL}/churches`);
    await page.waitForLoadState('networkidle');

    // 교회 코드는 실행 ID로 유니크하게 생성되므로 중복 없음
    const churchRow = page.getByRole('row', { name: new RegExp(LIFECYCLE_CHURCH.churchCode) });
    await churchRow.getByRole('link', { name: '상세' }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: new RegExp(LIFECYCLE_CHURCH.churchName) })).toBeVisible();

    // 삭제 버튼 → 확인 버튼
    await page.getByRole('button', { name: '교회 삭제' }).click();
    await expect(page.getByText('정말 삭제하시겠습니까?')).toBeVisible();
    await page.getByRole('button', { name: '확인' }).click();

    await page.waitForURL(`${SUPER_ADMIN_URL}/churches`, { timeout: 15000 });

    // ─── Step 4: 전체 쿠키 초기화 (슈퍼어드민 작업 완료, 교회어드민 재로그인 테스트 준비) ──
    // 슈퍼어드민 세션은 더 이상 불필요하므로 모든 쿠키 제거
    await page.context().clearCookies();

    // ─── Step 5: 교회어드민 재로그인 → 실패 ─────────────────────────────
    await page.goto(`${CHURCH_ADMIN_URL}/login`);
    await page.waitForLoadState('networkidle');

    await page.locator('input[type="email"]').fill(LIFECYCLE_CHURCH.ownerEmail);
    await page.locator('input[type="password"]').fill(LIFECYCLE_CHURCH.ownerPassword);
    await page.getByRole('button', { name: /로그인/ }).click();
    await page.waitForLoadState('networkidle');

    // 로그인 실패: 교회 삭제 시 church_admins.is_active = false로 변경되어 차단됨
    await expect(page).toHaveURL(`${CHURCH_ADMIN_URL}/login`, { timeout: 10000 });
    await expect(page.getByText(/어드민 계정이 아니거나 비활성화/)).toBeVisible({ timeout: 5000 });
  });
});
