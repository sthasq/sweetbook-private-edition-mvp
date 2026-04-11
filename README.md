# PlayPick MVP

PlayPick은 크리에이터가 직접 만든 공식 포토북 에디션을 팬이 자기 이야기로 개인화해 주문할 수 있는 웹앱입니다.  
이번 과제에서는 Sweetbook **Books API**와 **Orders API**를 실제 최종 사용자 흐름 안에 넣는 데 집중했고, 팬 주문 흐름과 크리에이터 스튜디오를 하나의 제품 경험으로 연결했습니다.

## 한 줄 소개

크리에이터가 에디션을 올리고, 팬이 내 문장과 추억을 더해 실물 포토북으로 주문하는 서비스입니다.

## 무엇을 만들었나

### 팬 경험

1. 공개된 에디션을 둘러본다.
2. 마음에 드는 에디션을 골라 개인화 정보를 입력한다.
3. 미리보기에서 포토북을 만들고 인쇄용으로 확정한다.
4. 배송지와 결제를 마친 뒤 실물 포토북 주문을 완료한다.

### 크리에이터 경험

1. 스튜디오에서 새 에디션을 만든다.
2. 커버, 소개, 템플릿, 자산을 구성한다.
3. 기존 에디션을 다시 열어 수정하거나 공개한다.
4. 주문 대시보드에서 주문 현황과 최근 상태를 확인한다.

## 핵심 구현 포인트

- **Sweetbook Books API + Orders API 연동**
  - 책 생성, 표지/내지 구성, 최종화, 견적, 주문까지 연결
- **팬 주문 흐름 단순화**
  - `개인화 -> 미리보기 -> 배송/결제`로 책임을 분리
- **크리에이터 스튜디오**
  - 주문 대시보드와 에디션 제작/편집 동선 제공
- **서비스 언어 정리**
  - 내부 구현 용어보다 사용자 관점 문구를 우선
- **체험 모드 지원**
  - 일부 외부 연동 없이도 로컬 시연 가능
- **백엔드 중심 비밀키 관리**
  - 외부 API 키는 React 클라이언트에 노출하지 않음

## 왜 이렇게 만들었나

이번 과제의 핵심은 단순히 API를 호출하는 것이 아니라, **Books API와 Orders API를 사용자가 실제로 겪는 주문 흐름 안에 자연스럽게 녹이는 것**이라고 판단했습니다.

그래서 일반 포토북 제작기보다는,

- 크리에이터가 먼저 승인한 공식 에디션이 있고
- 팬은 그 안에서 자신의 추억과 문장을 더해
- 실제 포토북 주문까지 이어지는 구조

로 제품을 정의했습니다.

## 기술 스택

- Frontend: React 19, Vite, TypeScript, Tailwind CSS
- Backend: Spring Boot 3.5, Java 17, Spring Data JPA, Flyway
- Database: MySQL 8
- Session / Cache: Redis 7
- Infra: Docker Compose, nginx
- External APIs:
  - Sweetbook Books API
  - Sweetbook Orders API
  - Google OAuth 2.0
  - YouTube Data API v3
  - Toss Payments
  - OpenRouter

## 저장소 구조

```text
.
├── backend
│   ├── Dockerfile
│   ├── build.gradle
│   ├── run_local.ps1
│   └── src
├── frontend
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src
├── docker-compose.yml
├── .env.example
└── README.md
```

## 빠른 실행

### 1. 환경 변수 파일 준비

```powershell
.\init_env.ps1
```

필수에 가까운 값:

- `SWEETBOOK_API_KEY`
- `SWEETBOOK_WEBHOOK_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `YOUTUBE_API_KEY`
- `TOSS_PAYMENTS_CLIENT_KEY`
- `TOSS_PAYMENTS_SECRET_KEY`

값이 비어 있어도 일부 흐름은 체험 모드로 확인할 수 있습니다.

### 2. Docker로 전체 실행

```powershell
docker compose up --build
```

접속 주소:

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:8080](http://localhost:8080)
- Swagger UI: [http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)

### 3. 로컬 개발 실행

백엔드:

```powershell
cd backend
.\run_local.ps1
```

프론트엔드:

```powershell
cd frontend
npm install
npm run dev
```

Vite는 [http://localhost:3000](http://localhost:3000)에서 실행되며 `/api` 요청을 백엔드로 프록시합니다.

## 데모 계정

- 팬: `fan@playpick.local` / `Fan12345!`
- 크리에이터: `creator@playpick.local` / `Creator123!`

공개 홈과 에디션 상세는 비로그인으로 볼 수 있고, 프로젝트 생성/주문/스튜디오는 로그인 후 사용할 수 있습니다.

## 실행 모드

### 체험 모드

- 일부 외부 연동 없이도 핵심 흐름을 볼 수 있음
- 로그인, 에디션 탐색, 개인화, 미리보기, 스튜디오 UI 확인 가능
- Sweetbook 또는 결제 키가 없으면 일부 단계는 체험 흐름으로 동작

### 실연동 모드

- Sweetbook API 키가 있으면 실제 책 생성/주문 API 호출
- Google OAuth 및 YouTube API 키가 있으면 채널 기반 개인화 보조 흐름 사용 가능
- Toss 키가 있으면 결제 준비 및 승인 흐름 확인 가능

## 주요 화면 / 흐름

### 홈

- 상품형 홈 구조
- 추천 에디션, 가격 힌트, 주문 안내, 크리에이터 상품관 제공

### 에디션 상세

- 크리에이터 소개, 에디션 설명, 예상 제작가, 개인화 진입 CTA 제공

### 개인화 / 미리보기 / 배송

- 팬의 텍스트와 사진 입력
- 포토북 생성 및 인쇄용 확정
- 배송 정보 입력, 예상 금액 확인, 결제

### 크리에이터 스튜디오

- 주문 대시보드
- 새 에디션 제작
- 기존 에디션 재편집
- 커버 업로드 및 공유 링크 복사

## Sweetbook API 사용 방식

### Books API

- `GET /book-specs`
- `GET /templates`
- `POST /books`
- `POST /books/{bookUid}/cover`
- `POST /books/{bookUid}/contents`
- `POST /books/{bookUid}/finalization`

### Orders API

- `POST /orders/estimate`
- `POST /orders`

### 앱 내부 흐름

- 크리에이터가 에디션을 저장/공개
- 팬이 프로젝트를 만들고 개인화
- 미리보기 단계에서 포토북 생성과 인쇄 확정
- 배송 단계에서 견적과 결제 준비
- 주문 생성 후 스튜디오에서 상태 추적

## 대표 API 엔드포인트

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `GET` | `/api/editions` | 공개 에디션 목록 |
| `GET` | `/api/editions/{id}` | 에디션 상세 |
| `POST` | `/api/projects` | 팬 프로젝트 생성 |
| `PATCH` | `/api/projects/{id}` | 개인화 데이터 저장 |
| `GET` | `/api/projects/{id}/preview` | 미리보기 조회 |
| `POST` | `/api/projects/{id}/generate-book` | 포토북 생성 |
| `POST` | `/api/projects/{id}/finalize-book` | 인쇄용 확정 |
| `POST` | `/api/projects/{id}/estimate` | 예상 금액 조회 |
| `POST` | `/api/projects/{id}/payment-session` | 결제 세션 준비 |
| `POST` | `/api/projects/{id}/payments/confirm` | 결제 승인 |
| `POST` | `/api/projects/{id}/order` | 주문 생성 |
| `GET` | `/api/studio/orders` | 크리에이터 주문 대시보드 |
| `GET` | `/api/studio/editions` | 내 에디션 목록 |
| `POST` | `/api/studio/editions` | 에디션 생성 |
| `PATCH` | `/api/studio/editions/{id}` | 에디션 수정 |
| `POST` | `/api/studio/editions/{id}/publish` | 에디션 공개 |
| `POST` | `/api/studio/assets/cover` | 커버 이미지 업로드 |

## 세션 / 캐시 구조

- 인증은 서버 세션 기반으로 처리합니다.
- Docker 및 MySQL 로컬 모드에서 Spring Session 데이터를 Redis에 저장합니다.
- Sweetbook 템플릿/규격 조회 결과는 Redis 기반 캐시를 사용합니다.

## 시드 데이터

로컬 실행 시 예시 크리에이터/에디션/프로젝트 데이터가 들어 있습니다.  
덕분에 아무것도 등록되지 않은 빈 상태가 아니라, 홈과 스튜디오를 바로 둘러볼 수 있습니다.

## 검증 명령

백엔드:

```powershell
cd backend
.\gradlew.bat test
```

프론트엔드:

```powershell
cd frontend
npm run lint
npm run build
```

도커:

```powershell
docker compose up -d --build backend frontend
```

## 환경 변수 요약

| 변수 | 용도 |
| --- | --- |
| `SWEETBOOK_ENABLED` | Sweetbook 실연동 여부 |
| `SWEETBOOK_API_KEY` | Sweetbook API 키 |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 시크릿 |
| `GOOGLE_REDIRECT_URI` | Google OAuth 리다이렉트 URI |
| `YOUTUBE_API_KEY` | YouTube Data API 키 |
| `OPENROUTER_API_KEY` | AI 콜라보 이미지 생성용 키 |
| `TOSS_PAYMENTS_ENABLED` | Toss 결제 흐름 활성화 |
| `TOSS_PAYMENTS_CLIENT_KEY` | Toss 공개 키 |
| `TOSS_PAYMENTS_SECRET_KEY` | Toss 비밀 키 |
| `MYSQL_*` | MySQL 설정 |
| `REDIS_*` | Redis 설정 |

자세한 기본값은 [.env.example](./.env.example)에서 확인할 수 있습니다.

## 의도한 제품 방향

- **공식성 우선**: 크리에이터가 승인한 에디션과 팬 개인화를 분리
- **끝까지 닫힌 흐름**: 홈 -> 개인화 -> 미리보기 -> 주문 -> 스튜디오 추적
- **체험 가능성 우선**: 로컬에서 바로 흐름을 설명할 수 있도록 구성
- **서비스 언어 정리**: 내부 구현 용어보다 사용자 언어를 우선

## 현재 한계

- 실제 크리에이터 검증은 시드 데이터 기반입니다.
- YouTube 연동은 로컬 Google Cloud 설정이 필요합니다.
- Toss 결제 이후의 운영용 webhook 처리까지는 아직 범위 밖입니다.
- 운영 webhook은 `X-Sweetbook-Webhook-Secret` 헤더 검증용 비밀값 설정이 필요합니다.
- 커버 업로드 이후의 고급 미디어 편집 UX는 후속 과제입니다.

## AI 사용 메모

- 제품 방향, 카피, 구현 순서 정리에 AI를 보조 도구로 사용했습니다.
- 백엔드/프론트 초안 작성과 리팩터링 아이디어 탐색에도 활용했습니다.
- 최종 동작은 로컬 실행, 테스트, Swagger, 브라우저 확인으로 직접 검증했습니다.
