/**
 * Supabase Admin 클라이언트 헬퍼
 * E2E 테스트에서 인증/정리 관련 보조 작업을 수행
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
 * 테스트 환경에서 사용할 인증 코드를 준비
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

// ─── 신고 테스트 데이터 헬퍼 ──────────────────────────────────────

interface TestReportData {
  postId: string;
  reportId: string;
}

/**
 * 신고 테스트용 church_post + report 생성
 * service_role key 사용 → RLS 우회
 */
export async function createTestReportData(churchCode: string): Promise<TestReportData> {
  const supabase = getAdminClient();

  // 1. 교회 조회
  const { data: church } = await supabase
    .from('churches')
    .select('id')
    .eq('code', churchCode)
    .single();
  if (!church) throw new Error(`교회를 찾을 수 없습니다: ${churchCode}`);

  // 2. 해당 교회의 church_admin 유저 조회 (post 작성자로 사용)
  const { data: admin } = await supabase
    .from('church_admins')
    .select('user_id')
    .eq('church_id', church.id)
    .limit(1)
    .single();
  if (!admin) throw new Error('교회 어드민을 찾을 수 없습니다.');

  // 3. 테스트 church_post 생성
  const { data: post } = await supabase
    .from('church_posts')
    .insert({
      church_id: church.id,
      user_id: admin.user_id,
      category: 'FREE',
      title: '[E2E] 신고 테스트용 게시글',
      content: '이 글은 E2E 테스트를 위해 자동 생성된 게시글입니다.',
    })
    .select('id')
    .single();
  if (!post) throw new Error('테스트 게시글 생성 실패');

  // 4. 해당 글에 대한 report 생성
  const { data: report } = await supabase
    .from('reports')
    .insert({
      reporter_id: admin.user_id,
      target_type: 'CHURCH_POST',
      target_id: post.id,
      church_id: church.id,
      reason: 'SPAM',
      detail: 'E2E 테스트 신고',
      status: 'PENDING',
    })
    .select('id')
    .single();
  if (!report) throw new Error('테스트 신고 생성 실패');

  return { postId: post.id, reportId: report.id };
}

/**
 * 신고 테스트 데이터 정리
 */
export async function deleteTestReportData(data: TestReportData): Promise<void> {
  const supabase = getAdminClient();
  await supabase.from('reports').delete().eq('id', data.reportId);
  await supabase.from('church_posts').delete().eq('id', data.postId);
}

/**
 * 이전 실패 실행에서 남은 E2E 신고 테스트 데이터 전체 정리
 * beforeAll 시작 시 호출해 DB를 깨끗한 상태로 만듦
 */
export async function cleanupE2EReportData(churchCode: string): Promise<void> {
  const supabase = getAdminClient();
  const { data: church } = await supabase
    .from('churches')
    .select('id')
    .eq('code', churchCode)
    .maybeSingle();
  if (!church) return;

  const { data: posts } = await supabase
    .from('church_posts')
    .select('id')
    .eq('church_id', church.id)
    .eq('title', '[E2E] 신고 테스트용 게시글');

  if (posts && posts.length > 0) {
    const postIds = posts.map((p: any) => p.id);
    await supabase.from('reports').delete().in('target_id', postIds);
    await supabase.from('church_posts').delete().in('id', postIds);
  }
}

// ── STAFF 어드민 계정 헬퍼 ────────────────────────────────────────

interface TestStaffData {
  userId: string;
  email: string;
  password: string;
}

/**
 * 테스트용 STAFF church_admin 계정 생성
 */
export async function createTestStaffAdmin(churchCode: string): Promise<TestStaffData> {
  const supabase = getAdminClient();

  const { data: church } = await supabase
    .from('churches')
    .select('id')
    .eq('code', churchCode)
    .single();
  if (!church) throw new Error(`교회를 찾을 수 없습니다: ${churchCode}`);

  const email = `e2e_staff_${Date.now()}@test.com`;
  const password = 'Test1234!@';

  const { data: authUser, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: 'E2E스태프', nickname: `e2e_staff_${Date.now()}` },
  });
  if (error || !authUser?.user) throw new Error(`STAFF 유저 생성 실패: ${error?.message}`);

  const userId = authUser.user.id;

  // profile 트리거 대기 (최대 2초)
  for (let i = 0; i < 4; i++) {
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
    if (profile) break;
    await new Promise(r => setTimeout(r, 500));
  }

  await supabase.from('church_admins').insert({ user_id: userId, church_id: church.id, role: 'STAFF' });

  return { userId, email, password };
}

/**
 * 테스트용 STAFF 계정 삭제
 */
export async function deleteTestStaffAdmin(userId: string): Promise<void> {
  const supabase = getAdminClient();
  await supabase.from('church_admins').delete().eq('user_id', userId);
  await supabase.auth.admin.deleteUser(userId);
}

// ── 멤버십 테스트 데이터 헬퍼 ────────────────────────────────────

interface TestMemberData {
  userId: string;
  membershipId?: string;
}

/**
 * 테스트용 교인 계정 + 멤버십 생성
 */
export async function createTestMember(
  churchCode: string,
  status: 'PENDING' | 'APPROVED',
  role: 'MEMBER' | 'OPERATOR' = 'MEMBER',
): Promise<TestMemberData> {
  const supabase = getAdminClient();

  const { data: church } = await supabase
    .from('churches')
    .select('id')
    .eq('code', churchCode)
    .single();
  if (!church) throw new Error(`교회를 찾을 수 없습니다: ${churchCode}`);

  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const email = `e2e_member_${suffix}@test.com`;

  const { data: authUser, error } = await supabase.auth.admin.createUser({
    email,
    password: 'Test1234!@',
    email_confirm: true,
    user_metadata: { name: `E2E교인_${suffix}`, nickname: `e2e_m_${suffix}` },
  });
  if (error || !authUser?.user) throw new Error(`테스트 유저 생성 실패: ${error?.message}`);

  const userId = authUser.user.id;

  // profile 트리거 대기
  for (let i = 0; i < 4; i++) {
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
    if (profile) break;
    await new Promise(r => setTimeout(r, 500));
  }

  const { data: membership } = await supabase
    .from('memberships')
    .insert({ user_id: userId, church_id: church.id, status, role })
    .select('id')
    .single();

  return { userId, membershipId: membership?.id };
}

/**
 * 테스트 교인 계정 삭제
 */
export async function deleteTestMember(userId: string): Promise<void> {
  const supabase = getAdminClient();
  await supabase.from('memberships').delete().eq('user_id', userId);
  await supabase.auth.admin.deleteUser(userId);
}

// ──────────────────────────────────────────────────────────────────

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
