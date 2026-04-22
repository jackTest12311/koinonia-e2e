# Koinonia E2E Test Suite

이 프로젝트는 교회 커뮤니티 플랫폼 **Koinonia**의
슈퍼어드민 / 교회어드민 서비스를 대상으로 작성한 E2E 테스트 자동화 코드입니다.

실제 서비스 흐름을 기준으로 테스트를 구성했으며,
단순 기능 확인을 넘어 **서비스 간 연동, 인증 시나리오, 테스트 격리와 같은 실무형 문제를 어떻게 검증할 수 있는지**에 초점을 두었습니다.

---

## 프로젝트 목적

QA 업무를 수행하며 아래와 같은 문제를 자주 경험했습니다.

- 서비스가 분리되어 있어 개별 기능은 정상이어도 전체 흐름이 깨지는 문제
- 인증처럼 테스트 구성이 까다로운 영역
- 테스트 간 데이터와 세션이 서로 영향을 주는 문제
- UI 조작으로 선행 상태를 만들어야 해서 불안정한 테스트

이 프로젝트는 위와 같은 문제를 **E2E 테스트로 안정적으로 검증할 수 있는 구조**를 고민하며 구성했습니다.

---

## 기술 스택

- Playwright
- TypeScript
- Page Object Model (POM)
- Supabase Admin API (테스트 데이터 사전 보장)

---

## 주요 구현 포인트

### 1. API 기반 테스트 데이터 보장

UI 조작 없이 Supabase Admin API로 사전 상태를 구성합니다.

```typescript
// beforeAll에서 PENDING 교인 2명 + APPROVED 교인 1명 API로 생성
test.beforeAll(async () => {
  [pendingMember1, pendingMember2, approvedMember] = await Promise.all([
    createTestMember(churchCode, 'PENDING'),
    createTestMember(churchCode, 'PENDING'),
    createTestMember(churchCode, 'APPROVED', 'MEMBER'),
  ]);
});
```

"승인 버튼이 보여야 한다"는 테스트가 PENDING 교인이 없으면 통과할 수 없습니다.
UI로 교인을 만들면 테스트가 느려지고 직전 테스트에 종속됩니다.
**테스트 실행 전에 API로 상태를 보장**해 속도와 안정성을 모두 확보했습니다.

- `createTestMember` — PENDING/APPROVED 교인 계정 생성
- `createTestStaffAdmin` — STAFF 권한 어드민 계정 생성
- `createTestReportData` — 신고 대상 게시글 + 신고 레코드 생성
- `cleanupE2EReportData` — 이전 실행 잔여 데이터 일괄 정리

---

### 2. 크로스앱 통합 테스트

두 개의 독립된 서비스(슈퍼어드민 / 교회어드민)를 하나의 시나리오로 검증합니다.

- 서비스 간 상태 변화 흐름을 end-to-end로 확인
- 단일 서비스 테스트만으로는 놓치기 쉬운 연동 이슈를 검증

---

### 3. 인증 플로우 테스트

- 비밀번호 재설정과 같은 인증 시나리오를 안정적으로 검증
- OWNER / STAFF 역할별 메뉴 노출 여부 분리 검증
- 비인증 접근 차단, 로그아웃 후 재접근 차단

---

### 4. 테스트 데이터 격리

- `beforeAll` / `afterAll`로 테스트별 독립 데이터 생성 및 정리
- `cleanupE2EReportData`로 이전 실행 잔여 데이터 방지
- 반복 실행 및 병렬 실행 환경에서도 안정적으로 동작

---

### 5. 세션 격리

- 인증 상태가 다른 테스트에 영향을 주지 않도록 분리
- `storageState`로 로그인 세션 재사용, 인증 테스트는 `{ cookies: [], origins: [] }` 초기화

---

### 6. Page Object Model 적용

- 화면 단위로 로케이터와 액션을 분리
- 테스트 코드가 시나리오 중심으로 읽히도록 구성

---

## 프로젝트 구조

```text
pages/
├── super-admin/     # 슈퍼어드민 Page Objects
│   ├── DashboardPage.ts
│   ├── ChurchesPage.ts
│   ├── ReportsPage.ts
│   └── ...
└── church-admin/    # 교회어드민 Page Objects
    ├── DashboardPage.ts
    ├── MembersPage.ts
    ├── BulletinsPage.ts
    ├── ReportsPage.ts
    └── ...
tests/
├── super-admin/     # 슈퍼어드민 테스트 (KNA_SA_###)
└── church-admin/    # 교회어드민 테스트 (KNA_CA_###)
fixtures/
├── supabaseAdmin.ts # API 기반 테스트 데이터 헬퍼
└── testAccounts.ts  # 고정 테스트 계정
playwright.config.ts
```

---

## 테스트 결과

- **63 passed / 0 skipped / 0 failed**
  - 슈퍼어드민: 31개 (KNA_SA_010 ~ KNA_SA_039)
  - 교회어드민: 32개 (KNA_CA_001 ~ KNA_CA_037)

---

## 실행 방법

```bash
npm install
npx playwright install chromium
npm test
```

---

## 데모: 교회 라이프사이클 통합 테스트

![church-lifecycle demo](demo.gif)

> 슈퍼어드민에서 교회 생성 → 교회어드민 로그인 성공 → 교회 삭제 → 재로그인 차단까지,
> 두 개의 독립된 서비스를 단일 테스트 흐름으로 검증한 예시입니다.

---

## 정리

이 프로젝트는 단순히 테스트 코드를 작성하는 데 그치지 않고,
실제 서비스 환경에서 발생할 수 있는 문제를 어떤 구조로 재현하고 검증할 수 있을지 고민한 결과물입니다.

특히 **API 기반 데이터 보장, 서비스 간 흐름 검증, 인증 시나리오, 테스트 격리**처럼
실무에서 중요하다고 생각하는 영역을 중심으로 구성했습니다.
