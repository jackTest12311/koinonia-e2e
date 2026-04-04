/**
 * 크로스앱 통합 테스트 — 교인 라이프사이클
 * TC: KNA_CROSS_002 (= TC-SC-005)
 *
 * 1. 테스트 사용자 준비
 * 2. 가입 대기 상태 구성
 * 3. 교회어드민 웹에서 승인 수행
 * 4. 승인 이후 상태 변화 검증
 *
 * - church-admin storageState 사용 (이미 로그인된 상태)
 * - 테스트 종료 후 생성 데이터 정리
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { deleteAuthUser } from '../../fixtures/supabaseAdmin';

const CHURCH_ADMIN_URL = process.env.CHURCH_ADMIN_URL ?? 'http://localhost:3000';
const RUN_ID = Date.now().toString().slice(-6);

const TEST_MEMBER = {
  email: `member-${RUN_ID}@koinonia-test.app`,
  password: 'TestMember1234!',
  name: `테스트교인${RUN_ID}`,
  nickname: `교인${RUN_ID}`,
};

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 누락');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

test.describe('교인 라이프사이클 통합 테스트', () => {
  test.afterAll(async () => {
    await deleteAuthUser(TEST_MEMBER.email);
  });

  test('KNA_CROSS_002 | 유저 생성 → 시스템 교회 자동 배정 → 교회 승인 → TRANSFERRED', async ({ page }) => {
    const supabase = getAdminClient();

    // ─── Step 1: 테스트 유저 생성 ───────────────────────────────────────
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: TEST_MEMBER.email,
      password: TEST_MEMBER.password,
      email_confirm: true,
      user_metadata: {
        name: TEST_MEMBER.name,
        nickname: TEST_MEMBER.nickname,
      },
    });

    expect(userError).toBeNull();
    const testUserId = userData.user!.id;

    // 후속 처리 반영 대기
    await new Promise((r) => setTimeout(r, 1500));

    // ─── Step 2: 초기 소속 상태 구성 ───────────────────────────────────
    const { data: systemChurch } = await supabase
      .from('churches')
      .select('id')
      .eq('is_system', true)
      .single();

    expect(systemChurch).not.toBeNull();

    const { error: sysInsertError } = await supabase.from('memberships').insert({
      user_id: testUserId,
      church_id: systemChurch!.id,
      status: 'APPROVED',
      role: 'MEMBER',
      position: '가입중',
    });

    expect(sysInsertError).toBeNull();

    // ─── Step 3: 테스트 교회 가입 대기 상태 구성 ───────────────────────
    const { data: testChurch } = await supabase
      .from('churches')
      .select('id')
      .eq('code', process.env.TEST_CHURCH_CODE ?? 'TEST_CHURCH')
      .single();

    expect(testChurch).not.toBeNull();

    const { error: insertError } = await supabase.from('memberships').insert({
      user_id: testUserId,
      church_id: testChurch!.id,
      status: 'PENDING',
      role: 'MEMBER',
      position: '가입중',
    });

    expect(insertError).toBeNull();

    // ─── Step 4: 교회어드민 웹에서 승인 ─────────────────────────────────
    await page.goto(`${CHURCH_ADMIN_URL}/members`);
    await page.waitForLoadState('networkidle');

    // 대기 탭 클릭
    await page.getByRole('button', { name: /대기/ }).click();
    await page.waitForTimeout(500);

    // 테스트 교인 행 찾기
    const memberRow = page.getByRole('row', { name: new RegExp(TEST_MEMBER.name) });
    await expect(memberRow).toBeVisible({ timeout: 8000 });

    // 승인 클릭
    await memberRow.getByRole('button', { name: /승인/ }).click();
    await page.waitForTimeout(3000);

    // ─── Step 5: 승인 이후 상태 변화 확인 ──────────────────────────────
    const { data: afterSystem } = await supabase
      .from('memberships')
      .select('status')
      .eq('user_id', testUserId)
      .eq('church_id', systemChurch!.id)
      .single();

    const { data: afterReal } = await supabase
      .from('memberships')
      .select('status')
      .eq('user_id', testUserId)
      .eq('church_id', testChurch!.id)
      .single();

    expect(afterSystem?.status).toBe('TRANSFERRED');
    expect(afterReal?.status).toBe('APPROVED');
  });
});
