import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  outputDir: './test-results',           // 실패 스크린샷·영상 저장 위치
  reporter: [
    ['html', { outputFolder: './reports/html', open: 'never' }],
    ['json', { outputFile: './reports/results.json' }],
    ['junit', { outputFile: './reports/results.xml' }],
    ['list'],
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // ── Setup projects (로그인 상태 저장) ──────────────────────────
    {
      name: 'super-admin-setup',
      testDir: './tests/super-admin',
      testMatch: 'auth.setup.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.SUPER_ADMIN_URL ?? 'http://localhost:3001',
      },
    },
    {
      name: 'church-admin-setup',
      testDir: './tests/church-admin',
      testMatch: 'auth.setup.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.CHURCH_ADMIN_URL ?? 'http://localhost:3000',
      },
    },
    // ── Test projects (setup 완료 후 실행) ────────────────────────
    {
      // auth.spec.ts 제외: 로그아웃이 세션을 무효화하므로 마지막 실행
      name: 'super-admin',
      testDir: './tests/super-admin',
      testIgnore: ['**/auth.spec.ts', '**/password.spec.ts'],
      dependencies: ['super-admin-setup'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.SUPER_ADMIN_URL ?? 'http://localhost:3001',
        storageState: './fixtures/super-admin-auth.json',
      },
    },
    {
      // auth.spec.ts 단독 실행 (세션 불필요, 마지막 실행)
      name: 'super-admin-auth',
      testDir: './tests/super-admin',
      testMatch: ['**/auth.spec.ts', '**/password.spec.ts'],
      dependencies: ['super-admin'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.SUPER_ADMIN_URL ?? 'http://localhost:3001',
      },
    },
    {
      // auth.spec.ts 제외: 로그아웃이 세션을 무효화하므로 마지막 실행
      name: 'church-admin',
      testDir: './tests/church-admin',
      testIgnore: ['**/auth.spec.ts', '**/password.spec.ts'],
      dependencies: ['church-admin-setup'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.CHURCH_ADMIN_URL ?? 'http://localhost:3000',
        storageState: './fixtures/church-admin-auth.json',
      },
    },
    {
      // auth.spec.ts 단독 실행 (세션 불필요, 마지막 실행)
      name: 'church-admin-auth',
      testDir: './tests/church-admin',
      testMatch: ['**/auth.spec.ts', '**/password.spec.ts'],
      dependencies: ['church-admin'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.CHURCH_ADMIN_URL ?? 'http://localhost:3000',
      },
    },
    {
      // 크로스앱 통합 테스트: 슈퍼어드민 + 교회어드민 연계
      name: 'cross-app',
      testDir: './tests/cross',
      dependencies: ['super-admin-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: './fixtures/super-admin-auth.json',
      },
    },
  ],
});
