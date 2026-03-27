/**
 * Playwright JSON 결과를 날짜별 폴더에 마크다운 리포트로 저장
 * Obsidian Vault 경로가 설정되어 있으면 자동으로 복사 (실패 스크린샷 포함)
 *
 * 저장 구조:
 *   reports/
 *     2026-03-18/
 *       run_143022.md       ← 마크다운 요약
 *       run_143022.json     ← 원본 JSON
 *     html/                 ← Playwright HTML 리포트 (자동 생성)
 *     results.json          ← 최신 JSON (자동 생성)
 *
 * Obsidian 저장 구조 (OBSIDIAN_VAULT_PATH 설정 시):
 *   {OBSIDIAN_VAULT_PATH}/QA/E2E/
 *     2026-03-18_143022.md
 *     attachments/
 *       2026-03-18_143022_KNA_CA_021_screenshot.png  ← 실패 스크린샷
 *
 * 실행: npx ts-node scripts/save-report.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// ── 인터페이스 ──────────────────────────────────────────
interface TestSpec {
  title: string;
  ok: boolean;
  tests: Array<{
    results: Array<{
      status: 'passed' | 'failed' | 'skipped' | 'timedOut';
      duration: number;
      error?: { message: string };
      attachments?: Array<{ name: string; path?: string; contentType: string }>;
    }>;
  }>;
}

interface SuiteResult {
  title: string;
  file?: string;
  specs?: TestSpec[];
  suites?: SuiteResult[];
}

interface PlaywrightReport {
  stats: {
    startTime: string;
    duration: number;
    expected: number;
    skipped: number;
    unexpected: number;
    flaky: number;
  };
  suites: SuiteResult[];
}

interface FlatTest {
  title: string;
  file: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut';
  duration: number;
  errorMessage?: string;
  screenshotPath?: string;
}

// ── 헬퍼 ────────────────────────────────────────────────
function collectTests(suite: SuiteResult, file = ''): FlatTest[] {
  const currentFile = suite.file ?? file;
  const results: FlatTest[] = [];

  if (suite.specs) {
    for (const spec of suite.specs) {
      const result = spec.tests?.[0]?.results?.[0];
      const screenshotAttachment = result?.attachments?.find(
        (a) => a.name === 'screenshot' && a.path && fs.existsSync(a.path),
      );
      results.push({
        title: spec.title,
        file: currentFile,
        status: result?.status ?? 'skipped',
        duration: result?.duration ?? 0,
        errorMessage: result?.error?.message,
        screenshotPath: screenshotAttachment?.path,
      });
    }
  }
  if (suite.suites) {
    for (const sub of suite.suites) {
      results.push(...collectTests(sub, currentFile));
    }
  }
  return results;
}

const icon = (s: string) =>
  ({ passed: '✅', failed: '❌', skipped: '⏭️', timedOut: '⏱️' }[s] ?? '❓');

const ms = (n: number) => (n < 1000 ? `${n}ms` : `${(n / 1000).toFixed(1)}s`);

// TC ID 추출 (예: "KNA_CA_021 | 주보 등록 폼 열기" → "KNA_CA_021")
function extractTcId(title: string): string {
  const match = title.match(/KNA_[A-Z]+_\d+/);
  return match ? match[0] : title.slice(0, 20).replace(/[^a-zA-Z0-9_]/g, '_');
}

// ── 경로 ────────────────────────────────────────────────
const reportsRoot  = path.resolve(__dirname, '../reports');
const jsonPath     = path.join(reportsRoot, 'results.json');
const obsidianBase = process.env.OBSIDIAN_VAULT_PATH
  ? path.join(process.env.OBSIDIAN_VAULT_PATH, 'QA', 'E2E')
  : null;

if (!fs.existsSync(jsonPath)) {
  console.error('❌ reports/results.json 없음. 먼저 "npm test" 실행하세요.');
  process.exit(1);
}

// ── 데이터 파싱 ─────────────────────────────────────────
const report: PlaywrightReport = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
const allTests = report.suites.flatMap((s) => collectTests(s));

const passed  = allTests.filter((t) => t.status === 'passed').length;
const failed  = allTests.filter((t) => t.status === 'failed').length;
const skipped = allTests.filter((t) => t.status === 'skipped').length;
const total   = allTests.length;

const startDate = new Date(report.stats.startTime);
const dateStr   = startDate.toISOString().slice(0, 10);
const timeStr   = startDate.toTimeString().slice(0, 8).replace(/:/g, '');
const runDate   = startDate.toLocaleString('ko-KR');
const passRate  = total - skipped > 0 ? Math.round((passed / (total - skipped)) * 100) : 0;
const failedArr = allTests.filter((t) => t.status === 'failed');

// 파일별 그룹
const byFile: Record<string, FlatTest[]> = {};
for (const t of allTests) {
  const key = t.file || 'unknown';
  if (!byFile[key]) byFile[key] = [];
  byFile[key].push(t);
}

// ── 스크린샷 복사 (Obsidian) ─────────────────────────────
const screenshotMap: Record<string, string> = {}; // tcId → obsidian relative path

if (obsidianBase && failedArr.some((t) => t.screenshotPath)) {
  const attachDir = path.join(obsidianBase, 'attachments');
  fs.mkdirSync(attachDir, { recursive: true });

  for (const t of failedArr) {
    if (!t.screenshotPath) continue;
    const tcId = extractTcId(t.title);
    const destName = `${dateStr}_${timeStr}_${tcId}.png`;
    const destPath = path.join(attachDir, destName);
    try {
      fs.copyFileSync(t.screenshotPath, destPath);
      screenshotMap[t.title] = `attachments/${destName}`;
      console.log(`   📸 스크린샷 저장: ${destName}`);
    } catch {
      console.warn(`   ⚠️  스크린샷 복사 실패: ${t.screenshotPath}`);
    }
  }
}

// ── 마크다운 생성 ────────────────────────────────────────
let md = `# Koinonia E2E 테스트 결과\n\n`;
md += `> 실행일시: **${runDate}** | 총 소요시간: **${ms(report.stats.duration)}**\n\n`;
md += `---\n\n`;

md += `## 📊 요약\n\n`;
md += `| 항목 | 수 |\n|------|:---:|\n`;
md += `| ✅ 통과 | **${passed}** |\n`;
md += `| ❌ 실패 | **${failed}** |\n`;
md += `| ⏭️ 스킵 | **${skipped}** |\n`;
md += `| 합계 | **${total}** |\n\n`;
md += `**통과율: ${passRate}%** (스킵 제외)\n\n`;

if (failedArr.length > 0) {
  md += `---\n\n## ❌ 실패 목록\n\n`;
  for (const t of failedArr) {
    md += `### ${t.title}\n`;
    md += `- 파일: \`${path.basename(t.file, '.ts')}\`\n`;
    if (t.errorMessage) {
      const msg = t.errorMessage.split('\n').slice(0, 8).join('\n');
      md += `\`\`\`\n${msg}\n\`\`\`\n`;
    }
    const ssPath = screenshotMap[t.title];
    if (ssPath) {
      md += `\n![스크린샷](${ssPath})\n`;
    }
    md += '\n';
  }
}

md += `---\n\n## 📋 전체 결과\n\n`;
for (const [file, tests] of Object.entries(byFile)) {
  const fPassed  = tests.filter((t) => t.status === 'passed').length;
  const fFailed  = tests.filter((t) => t.status === 'failed').length;
  const fSkipped = tests.filter((t) => t.status === 'skipped').length;
  const label    = path.basename(file, '.ts').replace(/\./g, ' ');

  md += `### ${label}\n`;
  md += `통과 ${fPassed} / 실패 ${fFailed} / 스킵 ${fSkipped}\n\n`;
  md += `| TC | 상태 | 시간 |\n|-----|:----:|------:|\n`;
  for (const t of tests) {
    md += `| ${t.title} | ${icon(t.status)} | ${ms(t.duration)} |\n`;
  }
  md += '\n';
}

// ── 저장: e2e/reports/{날짜}/ ────────────────────────────
const dayDir = path.join(reportsRoot, dateStr);
fs.mkdirSync(dayDir, { recursive: true });

const mdFilename   = `run_${timeStr}.md`;
const jsonFilename = `run_${timeStr}.json`;

fs.writeFileSync(path.join(dayDir, mdFilename), md, 'utf-8');
fs.copyFileSync(jsonPath, path.join(dayDir, jsonFilename));

console.log(`\n✅ 리포트 저장 완료`);
console.log(`   📁 ${path.join('reports', dateStr, mdFilename)}`);
console.log(`   📄 ${path.join('reports', dateStr, jsonFilename)}`);

// ── 저장: Obsidian Vault (설정된 경우) ───────────────────
if (obsidianBase) {
  fs.mkdirSync(obsidianBase, { recursive: true });
  const obsidianFile = path.join(obsidianBase, `${dateStr}_${timeStr}.md`);
  fs.writeFileSync(obsidianFile, md, 'utf-8');
  console.log(`   📓 Obsidian: QA/E2E/${dateStr}_${timeStr}.md`);

  // Obsidian 저장 완료 후 test-results/ 삭제 (용량 절약)
  const testResultsDir = path.resolve(__dirname, '../test-results');
  if (fs.existsSync(testResultsDir)) {
    fs.rmSync(testResultsDir, { recursive: true, force: true });
    console.log(`   🗑️  test-results/ 삭제 완료 (용량 절약)`);
  }
} else {
  console.log(`\n💡 Obsidian 저장 비활성 — .env.local에 OBSIDIAN_VAULT_PATH 추가 시 자동 복사됩니다.`);
}

console.log(`\n통과 ${passed} / 실패 ${failed} / 스킵 ${skipped} (총 ${total}개, ${passRate}%)`);
