# PlayPick — 크리에이터 포토북 개인화 주문 플랫폼

> Sweetbook Books API · Orders API를 활용해, 크리에이터가 에디션을 등록하고 팬이 자신의 이야기를 더해 실물 포토북을 주문하는 풀스택 웹 서비스입니다.

---

## 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [접근 방식](#접근-방식)
3. [주요 기능](#주요-기능)
4. [기술 스택](#기술-스택)
5. [아키텍처](#아키텍처)
6. [실행 방법](#실행-방법)
7. [데모 계정](#데모-계정)
8. [Sweetbook API 연동](#sweetbook-api-연동)
9. [주요 API 엔드포인트](#주요-api-엔드포인트)
10. [테스트](#테스트)
11. [설계 결정과 트레이드오프](#설계-결정과-트레이드오프)
12. [현재 범위와 한계](#현재-범위와-한계)
13. [환경 변수](#환경-변수)

---

## 프로젝트 개요

PlayPick은 크리에이터가 직접 구성한 포토북 **에디션**을 팬이 둘러보고, 자신의 문장·사진·추억을 더해 개인화한 뒤 실물 포토북으로 주문하는 서비스입니다.

단순히 Sweetbook API를 호출하는 클라이언트가 아니라, **"에디션 탐색 → 개인화 → 포토북 생성 → 인쇄 확정 → 결제 → 주문"**이라는 사용자 흐름 안에서 Books API와 Orders API가 자연스럽게 동작하는 제품 경험을 만드는 데 집중했습니다.

### 왜 이 구조인가

일반 포토북 제작기는 빈 페이지에서 시작합니다. PlayPick은 다르게 접근했습니다.

- 크리에이터가 먼저 **공식 에디션**(표지, 레이아웃, 큐레이션 이미지)을 구성해 공개합니다.
- 팬은 그 에디션 안에서 자신의 이야기를 채워 넣어 **세상에 하나뿐인 포토북**을 완성합니다.
- 크리에이터의 콘텐츠 가치와 팬의 개인 경험이 한 권의 책에 결합되는 구조입니다.

이 방식이 Sweetbook의 Books API(조판·표지·내지 구성)와 Orders API(견적·주문)를 가장 자연스럽게 활용할 수 있는 시나리오라고 판단했습니다.

---

## 접근 방식

### 제품 관점

| 원칙 | 설명 |
| --- | --- |
| **끝까지 닫힌 흐름** | 홈 → 개인화 → 미리보기 → 주문 → 스튜디오 추적까지, 한 번도 이탈하지 않는 흐름 |
| **공식성 우선** | 크리에이터가 승인한 에디션 안에서만 개인화가 이루어지는 구조 |
| **서비스 언어** | 내부 구현 용어(Sweetbook, 최종화, 퍼블리시)를 사용자 관점으로 번역 |
| **체험 가능성** | API 키 없이도 핵심 흐름을 확인할 수 있는 체험 모드 지원 |

### 기술 관점

| 결정 | 이유 |
| --- | --- |
| **API 키를 백엔드에서만 관리** | Sweetbook·Toss 비밀키가 프론트엔드에 노출되지 않도록 서버 사이드 호출로 통일 |
| **내부 주문과 외부 발주 분리** | 사이트 주문 상태와 Sweetbook 제작/출고 상태를 독립적으로 추적 |
| **서버 세션 + Redis** | OAuth 인증 상태와 Sweetbook 캐시를 안정적으로 관리 |
| **Flyway 마이그레이션** | 스키마 변경 이력을 코드로 추적하고, 시드 데이터로 즉시 체험 가능 |

---

## 주요 기능

### 팬 흐름

| 단계 | 설명 |
| --- | --- |
| **에디션 탐색** | 홈에서 공개된 에디션을 둘러보고, 가격·크리에이터 정보를 확인 |
| **개인화** | 닉네임, 메시지, 사진, YouTube 구독 정보 등을 입력 |
| **미리보기** | 입력 내용이 반영된 포토북을 페이지별로 확인 |
| **포토북 생성 · 인쇄 확정** | Sweetbook Books API로 책을 생성하고, 인쇄용으로 확정 |
| **배송 · 결제** | 배송지 입력 → 예상 금액 확인 → Toss Payments 결제 → Sweetbook 주문 생성 |

### 크리에이터 흐름

| 단계 | 설명 |
| --- | --- |
| **에디션 제작** | 제목, 커버, 소개문구, 레이아웃 템플릿, 큐레이션 이미지 구성 |
| **공개** | 완성된 에디션을 팬에게 공개 |
| **주문 관리** | 들어온 팬 주문의 현황과 제작 상태를 대시보드에서 확인 |

---

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS |
| **Backend** | Spring Boot 3.5, Java 17, Spring Data JPA, Spring Security, Spring WebFlux (외부 API 호출) |
| **Database** | MySQL 8 |
| **Session / Cache** | Redis 7, Spring Session, Spring Cache |
| **DB 마이그레이션** | Flyway |
| **API 문서** | springdoc-openapi (Swagger UI) |
| **인프라** | Docker Compose, nginx (리버스 프록시) |
| **외부 연동** | Sweetbook Books/Orders API, Google OAuth 2.0, YouTube Data API v3, Toss Payments, OpenRouter (AI 이미지) |

---

## 아키텍처

### 저장소 구조

```text
.
├── backend/
│   ├── src/main/java/com/playpick/
│   │   ├── api/              ← REST 컨트롤러
│   │   ├── application/      ← 서비스, 커맨드, 뷰 DTO
│   │   ├── config/           ← 설정 (보안, CORS, Redis, 외부 API 프로퍼티)
│   │   ├── domain/           ← 엔티티, 리포지토리, 값 객체
│   │   ├── infrastructure/   ← 외부 API 클라이언트 (Sweetbook, YouTube)
│   │   └── security/         ← 인증 컨텍스트
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   └── db/migration/     ← Flyway 마이그레이션 (V1~V18)
│   ├── src/test/             ← 통합 테스트, 단위 테스트
│   ├── Dockerfile
│   └── build.gradle
├── frontend/
│   ├── src/
│   │   ├── pages/            ← 14개 페이지 컴포넌트
│   │   ├── components/       ← 공통 컴포넌트 (Layout, Stepper 등)
│   │   ├── api/              ← 백엔드 API 호출 함수
│   │   ├── auth/             ← 인증 상태 관리
│   │   ├── lib/              ← 유틸리티 (상태 라벨, 가격 추정 등)
│   │   └── types/            ← TypeScript 타입 정의
│   ├── nginx.conf            ← /api → backend 프록시
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── init_env.ps1              ← 환경 변수 초기화 스크립트
```

### 요청 흐름

```text
브라우저 ──→ nginx(:3000) ──→ React SPA (정적 파일)
                │
                └─ /api/* ──→ Spring Boot(:8080) ──→ MySQL / Redis
                                    │
                                    ├─→ Sweetbook API (책 생성, 주문)
                                    ├─→ Toss Payments API (결제)
                                    ├─→ YouTube Data API (채널/영상 정보)
                                    └─→ Google OAuth (로그인)
```

### 핵심 도메인 모델

```text
Edition (에디션) ──1:N── EditionVersion (버전 스냅샷)
    │                         │
    │                         └── 레이아웃, 표지, 큐레이션 자산, 개인화 스키마
    │
    └──1:N── FanProject (팬 프로젝트)
                  │
                  ├── 개인화 데이터 (닉네임, 메시지, 사진 등)
                  ├── Sweetbook bookUid (생성된 책 ID)
                  └──1:1── CustomerOrder (내부 주문)
                                │
                                └──1:1── OrderRecord (Sweetbook 발주 기록)
```

---

## 실행 방법

### 사전 요구사항

- Docker Desktop
- (로컬 개발 시) Java 17+, Node.js 20+

### 1. 환경 변수 준비

```powershell
.\init_env.ps1
```

`.env.example`을 `.env`로 복사합니다. 아래 값을 채우면 전체 기능이 활성화됩니다.

| 변수 | 용도 | 없을 때 |
| --- | --- | --- |
| `SWEETBOOK_API_KEY` | 포토북 생성·주문 | 체험 모드로 동작 |
| `GOOGLE_CLIENT_ID` / `SECRET` | Google 로그인 | 이메일/비밀번호 로그인만 가능 |
| `YOUTUBE_API_KEY` | YouTube 기반 개인화 보조 | YouTube 연동 비활성 |
| `TOSS_PAYMENTS_CLIENT_KEY` / `SECRET_KEY` | 결제 | 일반 주문으로 전환 |

**값이 없어도 시드 데이터 기반으로 핵심 흐름을 체험할 수 있습니다.**

### 2. Docker로 전체 실행

```powershell
docker compose up --build
```

| 서비스 | 주소 |
| --- | --- |
| 프론트엔드 | http://localhost:3000 |
| 백엔드 API | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui/index.html |

### 3. 로컬 개발 실행 (선택)

```powershell
# MySQL + Redis만 Docker로 띄우기
docker compose up mysql redis -d

# 백엔드
cd backend
.\run_local.ps1

# 프론트엔드 (별도 터미널)
cd frontend
npm install
npm run dev
```

Vite 개발 서버(http://localhost:3000)가 `/api` 요청을 백엔드로 프록시합니다.

---

## 데모 계정

| 역할 | 이메일 | 비밀번호 |
| --- | --- | --- |
| 팬 | `fan@playpick.local` | `Fan12345!` |
| 크리에이터 | `creator@playpick.local` | `Creator123!` |

- 홈, 에디션 상세는 **비로그인**으로 볼 수 있습니다.
- 개인화·주문·스튜디오는 **로그인 후** 사용 가능합니다.
- 로컬 실행 시 시드 데이터(크리에이터, 에디션, 샘플 프로젝트)가 포함되어 있어 빈 상태 없이 바로 확인할 수 있습니다.

---

## Sweetbook API 연동

### 사용한 엔드포인트

| API | 엔드포인트 | PlayPick에서의 사용 시점 |
| --- | --- | --- |
| **Books** | `GET /book-specs` | 스튜디오에서 인쇄 규격 선택 |
| **Books** | `GET /templates` | 스튜디오에서 레이아웃 템플릿 선택 |
| **Books** | `POST /books` | 미리보기 단계에서 포토북 생성 |
| **Books** | `POST /books/{uid}/cover` | 포토북 표지 구성 |
| **Books** | `POST /books/{uid}/contents` | 포토북 내지 구성 |
| **Books** | `POST /books/{uid}/finalization` | 인쇄용 확정 |
| **Orders** | `POST /orders/estimate` | 배송 단계에서 예상 금액 조회 |
| **Orders** | `POST /orders` | 결제 완료 후 실제 주문 생성 |

### 앱 내부 흐름과 API 호출 시점

```text
[팬: 개인화 입력]
        │
        ▼
[미리보기: "포토북 만들기" 클릭]
        │──→ POST /books (책 생성)
        │──→ POST /books/{uid}/cover (표지)
        │──→ POST /books/{uid}/contents (내지)
        ▼
[미리보기: "인쇄용으로 확정하기" 클릭]
        │──→ POST /books/{uid}/finalization
        ▼
[배송: 배송지 입력 후 "예상 금액 확인"]
        │──→ POST /orders/estimate
        ▼
[결제 완료]
        │──→ POST /orders (Sweetbook 주문 생성)
        ▼
[주문 완료 → 크리에이터 스튜디오에서 상태 추적]
```

### Webhook 수신

- `POST /api/sweetbook/webhooks`에서 Sweetbook의 제작 상태 변경 이벤트를 수신합니다.
- `X-Sweetbook-Webhook-Secret` 헤더로 서명을 검증합니다.
- 수신된 이벤트는 `SweetbookWebhookEvent` 테이블에 기록되며, `OrderRecord`의 제작 상태를 업데이트합니다.

---

## 주요 API 엔드포인트

### 공개 API

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `GET` | `/api/editions` | 공개 에디션 목록 |
| `GET` | `/api/editions/{id}` | 에디션 상세 |

### 팬 API (인증 필요)

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `POST` | `/api/projects` | 프로젝트 생성 |
| `PATCH` | `/api/projects/{id}` | 개인화 데이터 저장 |
| `GET` | `/api/projects/{id}/preview` | 미리보기 조회 |
| `POST` | `/api/projects/{id}/generate-book` | 포토북 생성 (→ Books API) |
| `POST` | `/api/projects/{id}/finalize-book` | 인쇄 확정 (→ Books API) |
| `POST` | `/api/projects/{id}/estimate` | 예상 금액 (→ Orders API) |
| `POST` | `/api/projects/{id}/payment-session` | 결제 세션 준비 |
| `POST` | `/api/projects/{id}/payments/confirm` | 결제 승인 |
| `POST` | `/api/projects/{id}/order` | 주문 생성 (→ Orders API) |

### 크리에이터 스튜디오 API (CREATOR 권한 필요)

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `GET` | `/api/studio/editions` | 내 에디션 목록 |
| `POST` | `/api/studio/editions` | 에디션 생성 |
| `PATCH` | `/api/studio/editions/{id}` | 에디션 수정 |
| `POST` | `/api/studio/editions/{id}/publish` | 에디션 공개 |
| `POST` | `/api/studio/assets/cover` | 커버 이미지 업로드 |
| `GET` | `/api/studio/orders` | 주문 대시보드 |

전체 API 명세는 Swagger UI(`/swagger-ui/index.html`)에서 확인할 수 있습니다.

---

## 테스트

### 백엔드

```powershell
cd backend
.\gradlew.bat test
```

| 테스트 | 범위 |
| --- | --- |
| `AuthAndAccessIntegrationTest` | 회원가입, 로그인, 권한별 접근 제어 |
| `AiCollabIntegrationTest` | AI 콜라보 이미지 생성 흐름 |
| `ProjectPreviewAssemblerTest` | 미리보기 DTO 조립 로직 단위 테스트 |

### 프론트엔드

```powershell
cd frontend
npm run lint    # ESLint 정적 분석
npm run build   # TypeScript 컴파일 + 프로덕션 빌드
```

### Docker 통합 확인

```powershell
docker compose up -d --build
# http://localhost:3000 접속 후 팬/크리에이터 흐름 직접 확인
```

---

## 설계 결정과 트레이드오프

### 내부 주문과 외부 발주 분리

사이트의 `CustomerOrder`와 Sweetbook 발주 `OrderRecord`를 별도 엔티티로 관리합니다. 이렇게 하면 결제는 완료됐지만 외부 발주가 지연되는 경우에도 사용자에게 일관된 주문 상태를 보여줄 수 있고, 크리에이터 스튜디오에서 사이트 주문 상태와 제작 상태를 독립적으로 추적할 수 있습니다.

### 에디션 버전 스냅샷

팬 프로젝트는 생성 시점의 에디션 버전을 스냅샷으로 고정합니다. 이후 크리에이터가 에디션을 수정해도 이미 시작된 팬 프로젝트에는 영향을 주지 않습니다.

### 체험 모드 (Simulated Mode)

Sweetbook API 키가 없거나 연동이 비활성화된 환경에서도 핵심 흐름을 확인할 수 있도록 체험 모드를 지원합니다. 포토북 생성과 주문 결과를 시뮬레이션해서 UI 흐름 전체를 검증할 수 있습니다.

### 백엔드에서만 외부 API 호출

Sweetbook API 키와 Toss 비밀 키는 React 클라이언트에 노출하지 않습니다. 모든 외부 API 호출은 Spring Boot 서버를 경유하며, 프론트엔드는 `/api` 프록시를 통해 백엔드와만 통신합니다.

### Sweetbook 응답 캐싱

`book-specs`와 `templates` 같은 변경 빈도가 낮은 응답은 Redis 캐시를 적용해 반복 호출을 줄였습니다.

---

## 현재 범위와 한계

- 크리에이터 인증/검증은 시드 데이터 기반이며, 실제 승인 프로세스는 구현 범위 밖입니다.
- YouTube 연동은 Google Cloud Console에서 OAuth 클라이언트와 API 키 설정이 필요합니다.
- Toss Payments 결제 이후의 운영용 webhook 처리(환불 등)는 아직 구현되지 않았습니다.
- Sweetbook webhook은 `X-Sweetbook-Webhook-Secret` 검증까지 구현되어 있으나, 운영 환경 배포 후 실 수신 검증은 추가로 필요합니다.
- StudioPage의 컴포넌트 분리가 더 필요합니다 (현재 한 파일에 로직이 집중).

---

## 환경 변수

| 변수 | 용도 | 기본값 |
| --- | --- | --- |
| `SWEETBOOK_ENABLED` | Sweetbook 실연동 여부 | `true` |
| `SWEETBOOK_API_KEY` | Sweetbook API 키 | — |
| `SWEETBOOK_BASE_URL` | Sweetbook API 주소 | sandbox URL |
| `SWEETBOOK_WEBHOOK_SECRET` | Webhook 서명 검증 키 | — |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID | — |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 시크릿 | — |
| `GOOGLE_REDIRECT_URI` | OAuth 리다이렉트 URI | `http://localhost:3000/oauth/google/callback` |
| `YOUTUBE_API_KEY` | YouTube Data API 키 | — |
| `OPENROUTER_API_KEY` | AI 콜라보 이미지용 | — |
| `TOSS_PAYMENTS_ENABLED` | Toss 결제 활성화 | `false` |
| `TOSS_PAYMENTS_CLIENT_KEY` | Toss 공개 키 | — |
| `TOSS_PAYMENTS_SECRET_KEY` | Toss 비밀 키 | — |
| `MYSQL_*` | MySQL 접속 정보 | `playpick` |
| `REDIS_*` | Redis 접속 정보 | `localhost:6380` |

전체 기본값은 [.env.example](./.env.example)을 참고하세요.

---

## AI 사용 안내

- 제품 방향 정의, UI 카피, 구현 순서 정리, 코드 초안 작성과 리팩터링에 AI를 보조 도구로 활용했습니다.
- 최종 동작은 로컬 실행, 테스트, Swagger UI, 브라우저 확인으로 직접 검증했습니다.
