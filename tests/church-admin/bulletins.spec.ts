/**
 * Church Admin - 주보 관리 테스트
 * TC: KNA_CA_020 ~ KNA_CA_027
 */

import { test, expect } from '@playwright/test';
import { BulletinsPage } from '../../pages/church-admin/BulletinsPage';
import { ChurchAdminDashboardPage } from '../../pages/church-admin/DashboardPage';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// 테스트용 임시 파일 생성 헬퍼
function createTempPdf(): string {
  const tmpPath = path.join(os.tmpdir(), `test_bulletin_${Date.now()}.pdf`);
  // 최소한의 PDF 바이너리 (1페이지 빈 PDF)
  const pdfContent = Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\n' +
    'xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n' +
    '0000000058 00000 n \n0000000115 00000 n \n' +
    'trailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF'
  );
  fs.writeFileSync(tmpPath, pdfContent);
  return tmpPath;
}

function createTempImage(): string {
  const tmpPath = path.join(os.tmpdir(), `test_bulletin_${Date.now()}.png`);
  // 1x1 PNG
  const pngContent = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a' +
    '4944415478016360000000020001e221bc330000000049454e44ae426082',
    'hex'
  );
  fs.writeFileSync(tmpPath, pngContent);
  return tmpPath;
}

test.describe.configure({ mode: 'serial' });

test.describe('교회어드민 주보 관리', () => {
  let tmpPdf: string;
  let tmpImg: string;

  test.beforeAll(() => {
    tmpPdf = createTempPdf();
    tmpImg = createTempImage();
  });

  test.afterAll(() => {
    fs.unlinkSync(tmpPdf);
    fs.unlinkSync(tmpImg);
  });

  test('KNA_CA_020 | 주보 관리 페이지 진입 → 목록 렌더링', async ({ page }) => {
    const bulletinsPage = new BulletinsPage(page);
    await bulletinsPage.goto();
    await bulletinsPage.expectLoaded();
  });

  test('KNA_CA_021 | 주보 등록 폼 열기', async ({ page }) => {
    const bulletinsPage = new BulletinsPage(page);
    await bulletinsPage.goto();
    await bulletinsPage.openUploadForm();

    await expect(page.locator('form')).toBeVisible();
  });

  test('KNA_CA_022 | PDF 주보 업로드 → file_type "PDF"로 저장', async ({ page }) => {
    const bulletinsPage = new BulletinsPage(page);
    await bulletinsPage.goto();
    await bulletinsPage.openUploadForm();

    const title = `E2E_PDF주보_${Date.now()}`;
    await bulletinsPage.fillBulletinForm({ title, weekDate: '2026-03-15' });
    await bulletinsPage.attachPDF(tmpPdf);
    await bulletinsPage.submitUpload();

    await page.waitForLoadState('networkidle');
    await bulletinsPage.expectBulletinVisible(title);
  });

  test('KNA_CA_023 | 이미지 1장 업로드 → file_type "IMAGE"로 저장', async ({ page }) => {
    const bulletinsPage = new BulletinsPage(page);
    await bulletinsPage.goto();
    await bulletinsPage.openUploadForm();

    const title = `E2E_이미지주보_${Date.now()}`;
    await bulletinsPage.fillBulletinForm({ title, weekDate: '2026-03-22' });
    await bulletinsPage.attachImages([tmpImg]);
    await bulletinsPage.submitUpload();

    await page.waitForLoadState('networkidle');
    await bulletinsPage.expectBulletinVisible(title);
  });

  test('KNA_CA_024 | 이미지 10장 초과 업로드 → 에러 메시지 표시', async ({ page }) => {
    const bulletinsPage = new BulletinsPage(page);
    await bulletinsPage.goto();
    await bulletinsPage.openUploadForm();

    // 11장 배열 생성
    const files = Array(11).fill(tmpImg);
    await bulletinsPage.attachImages(files);

    await expect(page.getByText(/이미지는 최대 10장/)).toBeVisible({ timeout: 3000 });
  });

  test('KNA_CA_025 | 제목 미입력 시 업로드 불가 (필수 필드)', async ({ page }) => {
    const bulletinsPage = new BulletinsPage(page);
    await bulletinsPage.goto();
    await bulletinsPage.openUploadForm();

    // 제목 없이 submit
    await bulletinsPage.fillBulletinForm({ title: '', weekDate: '2026-03-29' });
    await bulletinsPage.attachPDF(tmpPdf);
    await bulletinsPage.submitUpload();

    // 페이지 이동 없어야 함
    await expect(page).toHaveURL(/\/bulletins/);
  });

  test('KNA_CA_026 | 주보 삭제 → confirm 다이얼로그 → 목록에서 제거', async ({ page }) => {
    // serial 모드로 CA_022/023에서 업로드한 주보가 반드시 존재
    const bulletinsPage = new BulletinsPage(page);
    await bulletinsPage.goto();

    const deleteBtn = page.getByRole('button', { name: /삭제/ }).first();
    await expect(deleteBtn).toBeVisible({ timeout: 5000 });

    const beforeCount = await page.getByRole('button', { name: /삭제/ }).count();
    page.once('dialog', (dialog) => dialog.accept());
    await deleteBtn.click();
    await page.waitForTimeout(500);

    const afterCount = await page.getByRole('button', { name: /삭제/ }).count();
    expect(afterCount).toBe(beforeCount - 1);
  });

  test('KNA_CA_027 | 대시보드 최신 주보 섹션 → "전체 보기" 이동', async ({ page }) => {
    const dashboardPage = new ChurchAdminDashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.clickViewAllBulletins();

    await expect(page).toHaveURL(/\/bulletins/);
  });
});
