/**
 * RLS 정책 API 직접 검증
 * TC: KNA_RLS_001
 *
 * Playwright 브라우저 없이 Supabase JS 클라이언트로 직접 호출.
 * 미인증(anon) 세션에서 보호된 테이블 조회 시 빈 결과를 반환하는지 확인.
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

function getAnonClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL 또는 SUPABASE_ANON_KEY 누락');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

test.describe('RLS 정책 직접 검증 (anon client)', () => {
  test('KNA_RLS_001 | 미인증 사용자 church_posts 조회 → 빈 결과', async () => {
    const supabase = getAnonClient();
    const { data, error } = await supabase.from('church_posts').select('id');

    // RLS가 모든 행을 차단 → 빈 배열 반환, 에러 없음
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  test('KNA_RLS_002 | 미인증 사용자 memberships 조회 → 빈 결과', async () => {
    const supabase = getAnonClient();
    const { data, error } = await supabase.from('memberships').select('id');

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  test('KNA_RLS_003 | 미인증 사용자 global_posts 조회 → 빈 결과', async () => {
    const supabase = getAnonClient();
    const { data, error } = await supabase.from('global_posts').select('id');

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
