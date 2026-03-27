/**
 * 테스트 계정 정보
 * 실제 값은 .env.local에서 로드됩니다
 */

export const testAccounts = {
  superAdmin: {
    email: process.env.SUPER_ADMIN_EMAIL ?? '',
    password: process.env.SUPER_ADMIN_PASSWORD ?? '',
  },
  churchOwner: {
    email: process.env.CHURCH_ADMIN_EMAIL ?? '',
    password: process.env.CHURCH_ADMIN_PASSWORD ?? '',
  },
  churchStaff: {
    email: process.env.CHURCH_ADMIN_STAFF_EMAIL ?? '',
    password: process.env.CHURCH_ADMIN_STAFF_PASSWORD ?? '',
  },
} as const;

export const testUrls = {
  superAdmin: process.env.SUPER_ADMIN_URL ?? 'http://localhost:3001',
  churchAdmin: process.env.CHURCH_ADMIN_URL ?? 'http://localhost:3000',
} as const;

export const testChurch = {
  name: process.env.TEST_CHURCH_NAME ?? '테스트교회',
  code: process.env.TEST_CHURCH_CODE ?? 'TEST_CHURCH',
} as const;
