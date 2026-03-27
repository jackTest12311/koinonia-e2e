# Koinonia E2E Test Suite

Playwright + TypeScript + Page Object Model 기반의 E2E 테스트 프로젝트입니다.

## 구조

```
e2e/
├── pages/                    # Page Object Models
│   ├── super-admin/
│   │   ├── LoginPage.ts
│   │   ├── DashboardPage.ts
│   │   ├── ChurchesPage.ts
│   │   └── ReportsPage.ts
│   └── church-admin/
│       ├── LoginPage.ts
│       ├── DashboardPage.ts
│       ├── MembersPage.ts
│       └── BulletinsPage.ts
├── tests/
│   ├── super-admin/
│   │   ├── auth.setup.ts       # 로그인 상태 저장 (setup)
│   │   ├── auth.spec.ts        # 인증 테스트
│   │   ├── churches.spec.ts    # 교회 관리 테스트
│   │   ├── reports.spec.ts     # 신고 관리 테스트
│   │   └── password.spec.ts    # 비밀번호 찾기 (OTP)
│   ├── church-admin/
│   │   ├── auth.setup.ts
│   │   ├── auth.spec.ts        # 인증 테스트
│   │   ├── members.spec.ts     # 교인 관리 테스트
│   │   ├── bulletins.spec.ts   # 주보 관리 테스트
│   │   └── password.spec.ts    # 비밀번호 찾기 (OTP)
│   └── cross/
│       └── church-lifecycle.spec.ts  # 크로스앱 통합 테스트
├── fixtures/
│   ├── testAccounts.ts         # 테스트 계정 (env vars로 주입)
│   └── supabaseAdmin.ts        # Admin API 헬퍼 (OTP 생성, 데이터 정리)
├── .env.example
├── playwright.config.ts
└── package.json
```

## 시작하기

### 1. 의존성 설치

```bash
cd e2e
npm install
npx playwright install chromium
```

### 2. 환경 변수 설정

```bash
cp .env.example .env.local
# .env.local 파일을 열어 실제 값으로 채우기
```

### 3. 앱 실행 (별도 터미널)

```bash
# church-admin (port 3000)
cd ../church-admin && npm run dev

# super-admin (port 3001)
cd ../super-admin && npm run dev -- -p 3001
```

### 4. 테스트 실행

```bash
# 전체 테스트
npm test

# super-admin만
npm run test:super

# church-admin만
npm run test:church

# UI 모드 (시각적 디버깅)
npm run test:ui

# 헤드리스 OFF (브라우저 화면 보면서 실행)
npm run test:headed

# 리포트 보기
npm run report
```

## 테스트 목록

### Super Admin

| TC ID | 파일 | 내용 |
|-------|------|------|
| KNA_SA_001~005 | auth.spec.ts | 로그인/로그아웃/접근 제어 |
| KNA_SA_006~008 | password.spec.ts | OTP 비밀번호 찾기 3단계 |
| KNA_SA_010~022 | churches.spec.ts | 대시보드, 교회 목록, 등록, 상세, 활성/정지/삭제 |
| KNA_SA_020~025 | reports.spec.ts | 신고 목록, 필터, 처리, 기각 |

### Church Admin

| TC ID | 파일 | 내용 |
|-------|------|------|
| KNA_CA_001~006 | auth.spec.ts | 로그인/로그아웃/OWNER·STAFF 권한 분리 |
| KNA_CA_007~009 | password.spec.ts | OTP 비밀번호 찾기 3단계 |
| KNA_CA_010~016 | members.spec.ts | 교인 목록, 승인, 거절, OPERATOR 권한 |
| KNA_CA_020~027 | bulletins.spec.ts | 주보 업로드(PDF/이미지), 삭제, 유효성 검사 |

### Cross-App 통합 테스트

| TC ID | 파일 | 내용 |
|-------|------|------|
| KNA_CROSS_001 | church-lifecycle.spec.ts | 슈퍼어드민에서 교회 생성 → 교회어드민 로그인 성공 → 교회 삭제 → 재로그인 차단 검증 |

> **주목할 포인트**: 단일 테스트 내에서 두 개의 독립된 서비스(슈퍼어드민/교회어드민)를 오가며 상태 변화를 검증합니다. `RUN_ID` 기반 유니크 코드로 병렬 실행 충돌을 방지하고, `afterAll`로 생성한 Auth 유저와 DB 데이터를 자동 정리합니다.

## 주요 기법

| 기법 | 적용 위치 | 설명 |
|------|-----------|------|
| Page Object Model | `pages/` | 화면별 로케이터/액션 캡슐화 |
| storageState 재사용 | `auth.setup.ts` | 로그인 세션을 JSON으로 저장 → 매 테스트마다 로그인 생략 |
| Route Mock | `password.spec.ts` | OTP 요청을 mock 200으로 처리해 rate limit 우회 |
| Admin API OTP | `fixtures/supabaseAdmin.ts` | `generateLink()`로 실제 OTP 코드 획득 (이메일 수신 불필요) |
| 크로스앱 통합 | `tests/cross/` | 한 브라우저 컨텍스트에서 두 도메인을 이동하며 연동 검증 |
| 테스트 격리 | `playwright.config.ts` | 로그아웃 테스트를 별도 project로 분리해 세션 오염 방지 |

## 주의 사항

- `fixtures/*.json` (세션 토큰)은 `.gitignore` 처리됨
- `SUPABASE_SERVICE_ROLE_KEY`는 OTP 생성 및 테스트 데이터 정리에 사용
- 교회 등록 테스트(KNA_SA_015, KNA_CROSS_001)는 실제 Auth 유저를 생성하므로 테스트 환경에서 실행 권장
- `CHURCH_ADMIN_STAFF_EMAIL` 미설정 시 STAFF 관련 테스트 자동 skip
