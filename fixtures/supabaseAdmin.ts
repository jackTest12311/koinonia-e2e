/**
 * Supabase Admin 클라이언트 헬퍼
 * E2E 테스트에서 이메일 수신 없이 OTP를 직접 생성
 */

import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.');
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * 이메일로 Magic Link OTP를 생성하고 코드를 반환
 * 페이지에서 "인증번호 받기" 클릭 후 이 함수를 호출해야 함
 * (generateLink가 이전 OTP를 대체하므로 반환값을 사용)
 */
export async function generateOtp(email: string): Promise<string> {
  const supabase = getAdminClient();

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });

  if (error || !data?.properties?.email_otp) {
    throw new Error(`OTP 생성 실패: ${error?.message}`);
  }

  return data.properties.email_otp;
}

/**
 * 이메일로 Auth 유저를 찾아 삭제 (테스트 데이터 정리용)
 */
export async function deleteAuthUser(email: string): Promise<void> {
  const supabase = getAdminClient();
  const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const user = data.users.find((u) => u.email === email);
  if (user) {
    await supabase.auth.admin.deleteUser(user.id);
  }
}

/**
 * 교회 코드로 교회 + church_admins 레코드 삭제 (테스트 데이터 정리용)
 * Auth 유저는 별도로 deleteAuthUser로 삭제
 */
export async function deleteTestChurch(churchCode: string): Promise<void> {
  const supabase = getAdminClient();
  const { data: church } = await supabase
    .from('churches')
    .select('id')
    .eq('code', churchCode)
    .maybeSingle();

  if (!church) return;

  await supabase.from('church_admins').delete().eq('church_id', church.id);
  await supabase.from('churches').delete().eq('id', church.id);
}
