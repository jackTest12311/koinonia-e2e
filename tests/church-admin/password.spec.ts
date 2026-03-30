/**
 * Church Admin - 비밀번호 찾기 / 재설정 테스트
 * TC: KNA_CA_007 ~ KNA_CA_009
 */

import { test, expect, type Page } from '@playwright/test';
import { testAccounts } from '../../fixtures/testAccounts';
import { generateOtp } from '../../fixtures/supabaseAdmin';

test.use({ storageState: { cookies: [], origins: [] } }); // 세션 초기화

const ORIGINAL_PASSWORD = testAccounts.churchOwner.password;
const TEMP_PASSWORD = 'TestTemp1234!';

/** 테스트 환경에서 인증 요청 흐름을 안정적으로 고정 */
async function mockOtpSend(page: Page) {
  await page.route('**/auth/v1/otp', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'OTP sent' }),
    }),
  );
}

test.describe('교회어드민 비밀번호 찾기', () => {
  test('KNA_CA_007 | 이메일 입력 → 인증번호 발송 → OTP 단계 이동', async ({ page }) => {
    await mockOtpSend(page);
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');

    await page.locator('input[type="email"]').fill(testAccounts.churchOwner.email);
    await page.getByRole('button', { name: '인증번호 받기' }).click();

    // OTP 단계로 이동 확인
    await expect(page.getByText('인증번호 입력')).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder('인증번호 입력')).toBeVisible();
  });

  test('KNA_CA_008 | OTP 인증 → 새 비밀번호 설정 → 로그인 성공', async ({ page }) => {
    await mockOtpSend(page);
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');

    // 1단계: 이메일 입력
    await page.locator('input[type="email"]').fill(testAccounts.churchOwner.email);
    await page.getByRole('button', { name: '인증번호 받기' }).click();
    await expect(page.getByText('인증번호 입력')).toBeVisible({ timeout: 10000 });

    // 테스트 전용 헬퍼로 인증 코드를 준비
    const otp = await generateOtp(testAccounts.churchOwner.email);

    // 2단계: OTP 입력
    await page.getByPlaceholder('인증번호 입력').fill(otp);
    await page.getByRole('button', { name: '인증번호 확인' }).click();
    await expect(page.getByText('새 비밀번호 설정')).toBeVisible({ timeout: 10000 });

    // 3단계: 새 비밀번호 설정
    await page.getByPlaceholder('8자 이상').fill(TEMP_PASSWORD);
    await page.getByPlaceholder('비밀번호 재입력').fill(TEMP_PASSWORD);
    await page.getByRole('button', { name: '비밀번호 변경' }).click();

    // 로그인 페이지 이동 + 성공 메시지
    await expect(page).toHaveURL(/login/, { timeout: 10000 });
    await expect(page.getByText('비밀번호가 변경되었습니다')).toBeVisible();
  });

  test('KNA_CA_008_RESTORE | 비밀번호 원복 (테스트 데이터 정리)', async ({ page }) => {
    await mockOtpSend(page);
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');

    await page.locator('input[type="email"]').fill(testAccounts.churchOwner.email);
    await page.getByRole('button', { name: '인증번호 받기' }).click();
    await expect(page.getByText('인증번호 입력')).toBeVisible({ timeout: 10000 });

    const otp = await generateOtp(testAccounts.churchOwner.email);

    await page.getByPlaceholder('인증번호 입력').fill(otp);
    await page.getByRole('button', { name: '인증번호 확인' }).click();
    await expect(page.getByText('새 비밀번호 설정')).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder('8자 이상').fill(ORIGINAL_PASSWORD);
    await page.getByPlaceholder('비밀번호 재입력').fill(ORIGINAL_PASSWORD);
    await page.getByRole('button', { name: '비밀번호 변경' }).click();

    await expect(page).toHaveURL(/login/, { timeout: 10000 });
  });

  test('KNA_CA_009 | 잘못된 OTP 입력 → 에러 메시지 표시', async ({ page }) => {
    await mockOtpSend(page);
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');

    await page.locator('input[type="email"]').fill(testAccounts.churchOwner.email);
    await page.getByRole('button', { name: '인증번호 받기' }).click();
    await expect(page.getByText('인증번호 입력')).toBeVisible({ timeout: 10000 });

    // 잘못된 OTP
    await page.getByPlaceholder('인증번호 입력').fill('000000');
    await page.getByRole('button', { name: '인증번호 확인' }).click();

    await expect(page.getByText(/올바르지 않거나 만료/)).toBeVisible({ timeout: 5000 });
  });
});
