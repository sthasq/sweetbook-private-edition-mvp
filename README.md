# PlayPick

> Sweetbook 채용과제를 위해 만든 AI 채팅 인터뷰 기반 포토북 개인화 플랫폼

PlayPick은 크리에이터가 공개한 공식 에디션을 팬이 AI 채팅 인터뷰로 개인화하고, 실제 포토북 생성과 주문까지 이어지는 풀스택 서비스 데모입니다. Sweetbook Books API와 Orders API를 제품 흐름 안에 녹여냈고, FAN / CREATOR / ADMIN 세 역할을 분리해 사용자 경험과 운영 관점이 함께 보이도록 설계했습니다.

이 프로젝트는 기능을 넓게 나열하기보다, 아래 한 개의 end-to-end 흐름을 설득력 있게 완성하는 데 집중했습니다.

`에디션 탐색 -> AI 채팅 인터뷰 -> 미리보기 -> 인쇄 확정 -> 배송/결제 -> 주문 추적`

## 채용과제에서 먼저 봐주시면 좋은 포인트

- **팬 주문 흐름을 끝까지 완성**: 공개 에디션 탐색부터 AI 개인화, 실제 책형 미리보기, 인쇄 확정, 배송·결제, 주문 완료까지 하나의 선형 경험으로 설계했습니다.
- **외부 연동을 정직하게 분리**: 결제는 Toss, 실물 제작/발주는 Sweetbook으로 분리해, 실패 원인과 복구 경로가 섞이지 않도록 했습니다.
- **운영 관점도 함께 보여줌**: 관리자 콘솔에서 웹훅 로그, 실시간 알림, 사용자/정산/주문 목록을 역할별로 분리해 확인할 수 있습니다.
- **심사자 시연이 쉬운 데모 환경**: Docker Compose 하나로 실행 가능하고, 팬/크리에이터/관리자 데모 계정과 페이지네이션된 화면으로 주요 동선을 빠르게 확인할 수 있습니다.

## 빠른 링크

- 데모 배포: [https://gscheon.com/sweetbook-demo/](https://gscheon.com/sweetbook-demo/)
- Docker 실행 후 Swagger UI: `http://localhost:8080/swagger-ui/index.html`
- 예시 환경 변수: [`.env.example`](./.env.example)
- 운영 배포 설정: [`deploy/README.md`](./deploy/README.md)

## 화면 미리보기

| 홈 | 팬 미리보기 |
| --- | --- |
| ![홈 화면](./output/playwright/submission/01-home.png) | ![팬 미리보기](./output/playwright/submission/02-fan-preview.png) |

| 크리에이터 대시보드 | 관리자 대시보드 |
| --- | --- |
| ![크리에이터 대시보드](./output/playwright/submission/04-creator-dashboard.png) | ![관리자 대시보드](./output/playwright/submission/05-admin-dashboard.png) |

## 심사용 빠른 동선

1. **비로그인**으로 홈과 에디션 상세를 확인합니다.
2. **팬 계정**(`fan@playpick.local`)으로 로그인해 AI 채팅 인터뷰 -> `포토북 만들기` -> `인쇄용으로 확정하기` -> 배송·결제 흐름을 봅니다.
3. **크리에이터 계정**으로 에디션/주문 화면을 확인합니다.
4. **관리자 계정**으로 대시보드, 웹훅 로그, 실시간 알림을 확인합니다.

> 데모 정책상 주문은 팬 계정에서만 가능합니다. 크리에이터와 관리자는 구매 페이지 대신 운영용 화면에 집중되도록 분리했습니다.

## 주요 설계 및 구현 포인트

| 영역 | 구현 내용 |
| --- | --- |
| **제품 시나리오 정의** | `공식 에디션 + 팬 개인화`라는 구체적인 프로덕트 구조를 설정하여 Sweetbook API 연동의 현실성 확보 |
| **풀스택 아키텍처** | React 19 + Vite 프론트엔드, Spring Boot 3.5 백엔드, MySQL / Redis 통합 구성 |
| **신뢰성 있는 외부 연동** | Sweetbook API 호출 시점을 실제 사용자 여정과 1:1로 매핑하고, 결제 성공 후 외부 발주에 실패할 경우 재시도가 가능한 상태 기계(State Machine) 설계 |
| **사용자 중심 UX** | 긴 입력 폼 대신 AI 채팅 인터뷰를 중심 인터페이스로 도입하고, `포토북 만들기`를 비동기 작업으로 분리해 오래 걸리는 실연동 생성도 화면이 멈추지 않게 구성 |
| **현실적인 비즈니스 모델** | 단순 매출 분할이 아닌 `제작 원가(Vendor Cost) + 서비스 마진(Margin)` 구조를 적용하고, 주문 시점의 스냅샷으로 정산 데이터의 무결성 보장 |
| **보안 및 상태 격리** | 세션 인증 기반 CSRF 방어, Sweetbook 웹훅 HMAC 서명 검증, delivery dedupe, 주문-웹훅 재연결 처리로 외부 이벤트 무결성 보강 |
| **운영자 친화적 콘솔** | 관리자 웹훅 실시간 알림, 로그 연결 상태 표시, 역할별 목록 페이지네이션으로 심사자와 운영자가 큰 데이터 없이도 핵심 상태를 빠르게 읽을 수 있게 구성 |
| **유연한 배포 환경 지원** | Docker Compose 기반 실행 환경과 Nginx 서브패스 라우팅을 묶어 동일한 컨테이너 이미지를 데모/운영 환경에서 재사용할 수 있도록 CI/CD 및 인프라 구성 |

## 제품 고도화 기준

단순한 기능의 나열보다는 제품으로서의 완성도와 실서비스 수준의 신뢰성을 확보하는 데 집중했습니다.

1. **핵심 경험에 집중한 제품 단순화**
   - 부가적인 기능 연동을 덜어내고, 사용자가 하나의 에디션을 완성하고 주문하기까지의 선형적 인지 흐름이 끊기지 않도록 플로우를 구축했습니다.
   - 내부 시스템 용어(`시뮬레이터`, `최종화`) 대신, 다음 행동이 직관적으로 보이는 언어(`미리보기`, `인쇄용으로 확정하기`, `배송·결제`)로 UX Writing을 통일했습니다.
   - 에디션 상세 화면의 정보 밀도를 조절하고, 프리뷰 레이아웃을 실제 포토북의 전개 방식(표지 단독 - 중간 펼침면 - 마지막 발행면)과 동일하게 수정하여 이질감을 줄였습니다.

2. **시스템 연동의 무결성 확보**
   - 외부 API 장애 발생 시 서비스 내부 모의 성공으로 우회(fallback)하지 않고, 명확한 실패 처리 및 복구 경로를 제공하도록 시스템의 정직성을 높였습니다.
   - PG사(Toss) 결제 트랜잭션과 실물 제작 주문(Sweetbook) API의 트랜잭션을 철저히 분리하여, 결제 후 발생할 수 있는 발주 실패 등의 엣지 케이스를 안전하게 제어합니다.

3. **운영 환경을 고려한 데이터 모델링**
   - 초기 총매출액 비율 분배 모델을 폐기하고, 플랫폼 비즈니스의 운영 현실에 맞춰 `제작 원가 + 서비스 마진` 형태의 가격 모델 스키마로 마이그레이션했습니다.
   - 관리자 대시보드 및 정산 데이터 역시 철저히 제작 원가를 배제한 유효 마진을 기준으로 집계되도록 설계하여 실제 운영 가능성을 입증했습니다.

## 역할별 핵심 시나리오

| 역할 | 핵심 경험 | 구현 포인트 |
| --- | --- | --- |
| **팬** | 에디션 탐색 -> AI 채팅 인터뷰 -> 미리보기 -> 인쇄 확정 -> 배송/결제 -> 주문 | 대화형 개인화, 비동기 포토북 생성, Toss 테스트 결제, 주문 상태 추적 |
| **크리에이터** | 에디션 제작/공개 -> 주문 확인 -> 제작 상태 확인 | 스튜디오 플로우, 공개/비공개 관리, 프로젝트(에디션) 편집 흐름 |
| **관리자** | 전체 매출 / 원가 / 정산 / 웹훅 / 사용자 관리 | 운영용 대시보드, 마진/원가/플랫폼/크리에이터 정산액 분리 집계, 실시간 웹훅 알림과 페이지네이션된 로그 |

## 핵심 기능

### 1. 팬 경험을 AI 채팅 인터뷰 중심으로 재구성

- 사용자는 긴 폼을 채우는 대신 대화에 답하면서 닉네임, 추억, 메시지, 이미지 구성을 자연스럽게 완성합니다. (클릭형 Suggested Replies 적용)
- 서버는 OpenRouter 기반 응답을 개인화 제안서 형태로 정규화하고, 그 결과를 미리보기와 주문 단계로 이어줍니다.

### 2. Sweetbook API를 실제 제품 흐름에 맞춰 연결

| 단계 | Sweetbook / 외부 API | 사용 시점 |
| --- | --- | --- |
| 포토북 생성 | `POST /books` | 미리보기 화면에서 `포토북 만들기`를 눌렀을 때 백그라운드 생성 시작 |
| 표지 구성 | `POST /books/{uid}/cover` | 에디션 + 개인화 정보로 표지 반영 |
| 내지 구성 | `POST /books/{uid}/contents` | 24p 기준 페이지별 콘텐츠 반영 |
| 인쇄 확정 | `POST /books/{uid}/finalization` | 사용자가 제작 확정을 누를 때 |
| 배송비 추정 | `POST /orders/estimate` | 배송지 입력 후 예상 금액 계산 |
| 주문 생성 | `POST /orders` | 결제 승인 후 실제 주문 접수 |

```text
[Edition 탐색]
      ↓
[AI 채팅 인터뷰]
      ↓
[미리보기 (react-pageflip 기반 판형 렌더링)]
  └─ 포토북 만들기 (비동기 작업)
  ├─ POST /books
  ├─ POST /books/{uid}/cover
  └─ POST /books/{uid}/contents
      ↓
[인쇄용 확정]
  └─ POST /books/{uid}/finalization
      ↓
[배송 / 결제 (Toss 재시도 복구 지원)]
  ├─ POST /orders/estimate
  └─ POST /orders
```

### 3. 운영 관점까지 고려한 상태와 보안 분리

- `CustomerOrder`와 Sweetbook 발주용 `OrderRecord`를 분리해, 사이트 주문 상태와 외부 제작 상태를 독립적으로 다룹니다.
- 세션 보안 강화를 위해 CSRF 방어 로직을 활성화하고 프론트엔드 로그인/진입 시나리오와 동기화했습니다.
- Sweetbook 웹훅 수신 컨트롤러에 `X-Webhook-Timestamp` + `X-Webhook-Signature` 기반 HMAC 검증과 delivery 중복 방어를 붙여 인가되지 않은 외부 주문 상태 변경과 재전송 리스크를 줄였습니다.
- 관리자 콘솔에서는 웹훅 로그를 `주문 UID`, `연결 상태`, `처리 시각`, `수신 시각` 기준으로 보고, 새 이벤트는 SSE 스트림으로 즉시 알림을 받도록 했습니다.

## 아키텍처

```text
Browser
  -> React 19 + Vite SPA
  -> nginx (/api proxy)
  -> Spring Boot 3.5
     -> MySQL 8
     -> Redis 7
     -> Sweetbook Books API / Orders API
     -> Toss Payments
     -> OpenRouter
```

### 주요 설계 결정

| 결정 | 이유 |
| --- | --- |
| **백엔드만 외부 API 호출** | Sweetbook / Toss 비밀키를 프론트엔드에 노출하지 않기 위해 |
| **세션 + Redis + CSRF** | 브라우저 친화적인 인증 흐름을 유지하면서 상태 변경 요청을 보호하기 위해 |
| **Sweetbook 웹훅 서명 검증** | HMAC-SHA256과 timestamp 검증으로 외부 이벤트의 무결성과 신뢰 경계를 분명히 하기 위해 |
| **체험 모드 지원** | API 키가 없어도 핵심 흐름과 UI를 바로 검증할 수 있도록 하기 위해 |
| **서브패스 배포 대응** | Docker Compose 기반 데모 환경과 운영 배포가 같은 코드베이스로 유지되면서, `/sweetbook-demo` 같은 경로에서도 안정적으로 동작하게 하기 위해 |

### 주요 폴더

```text
.
├── backend/               # Spring Boot API, 도메인, 마이그레이션, 테스트
├── frontend/              # React SPA, 페이지, 공통 컴포넌트, API 클라이언트
├── deploy/                # 운영 배포 스크립트와 nginx 설정
├── docs/                  # 보조 문서와 회고
├── docker-compose.yml     # Docker 기반 통합 실행
└── .github/workflows/     # CI / 데모 배포 워크플로
```

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, React Router |
| Backend | Spring Boot 3.5, Java 17, Spring Security, Spring Data JPA, WebFlux |
| Database | MySQL 8, Redis 7, Flyway |
| API Docs | springdoc-openapi |
| Infra | Docker Compose, nginx, GitHub Actions |
| External | Sweetbook Books / Orders API, Toss Payments, OpenRouter |

## Docker 실행

### 사전 요구사항

- Docker Desktop

### 1. 환경 변수 준비

```powershell
.\init_env.ps1
```

- `.env.example`을 `.env`로 복사하고, 기본값을 채워줍니다.
- `SWEETBOOK_API_KEY`, `TOSS_PAYMENTS_*`, `OPENROUTER_API_KEY`가 없어도 시드 데이터와 체험 모드로 핵심 흐름 확인이 가능합니다.
- 실연동을 테스트하려면 공개 HTTPS 주소와 관련 환경 변수를 추가로 설정해야 합니다. 자세한 값은 [`.env.example`](./.env.example)을 참고하면 됩니다.

### 2. 전체 실행 (Docker Compose)

```powershell
docker compose up --build
```

| 서비스 | 주소 |
| --- | --- |
| 프론트엔드 | [http://localhost:3000](http://localhost:3000) |
| 백엔드 API | [http://localhost:8080](http://localhost:8080) |
| Swagger UI | [http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html) |

### 3. 데모 계정

| 역할 | 이메일 | 비밀번호 |
| --- | --- | --- |
| 팬 | `fan@playpick.local` | `Fan12345!` |
| 크리에이터 | `creator@playpick.local` | `Creator123!` |
| 관리자 | `admin@playpick.local` | `Admin12345!` |

- 홈과 에디션 상세는 비로그인으로 확인할 수 있습니다.
- 개인화, 주문, 스튜디오, 관리자 기능은 로그인 후 사용할 수 있습니다.
- 구매 플로우는 팬 계정에서만 열립니다. 크리에이터와 관리자는 운영/콘솔 화면만 확인할 수 있습니다.
- Toss 결제는 테스트 키 기준으로 연결되어 있어 실제 과금 없이 결제 흐름과 승인 이후 주문 생성까지 확인할 수 있습니다.
- 호스트에서 `bootRun`, `npm run dev`로 따로 띄우는 방식은 문서에서 제외하고, 동일한 Docker Compose 환경만 기준으로 유지합니다.

## 검증 방법

### Docker 기반 확인

```powershell
docker compose up --build
```

실행 후 아래 흐름을 바로 확인할 수 있습니다.

- 홈, 에디션 상세, 로그인, 관리자 대시보드 진입
- AI 채팅 인터뷰와 미리보기 생성
- Swagger UI를 통한 API 확인

### CI 검증

GitHub Actions에서도 아래를 자동 검증합니다.

- backend test
- frontend lint
- frontend production build
- 데모 배포용 서브패스 빌드 검증

### 수동 확인 시 추천 흐름

1. 홈에서 공개 에디션을 확인합니다.
2. 팬 계정으로 로그인해 AI 채팅 인터뷰를 완료합니다.
3. 미리보기에서 `포토북 만들기`와 `인쇄용으로 확정하기` 단계를 확인합니다.
4. 배송·결제에서 예상 금액 계산과 Toss 결제 진입을 확인합니다.
5. 크리에이터 계정으로 주문 대시보드를 확인합니다.
6. 관리자 계정으로 매출 / 정산 / 웹훅 화면과 실시간 웹훅 알림을 확인합니다.

## 신뢰성과 운영성에서 신경 쓴 부분

- 세션 인증 환경에서 CSRF 토큰 발급과 자동 첨부 흐름을 넣었습니다.
- Sweetbook 라이브 연동 실패를 데모 성공처럼 숨기지 않고, 명시적 실패로 노출하도록 바꿨습니다.
- Sweetbook 웹훅은 `X-Webhook-Timestamp`와 `X-Webhook-Signature`를 검증한 뒤에만 상태를 반영합니다.
- 시드 데이터와 체험 모드를 제공해 평가자가 API 키 없이도 바로 흐름을 볼 수 있게 했습니다.
- Docker Compose, 운영용 compose, 배포 스크립트, CI/CD 워크플로를 함께 남겨 특정 개발자 로컬 환경에 의존하지 않도록 했습니다.

## 현재 한계와 다음 단계

- `ProjectService`, `StudioPage`처럼 책임이 큰 파일은 아직 추가 분리가 필요합니다.
- `order.status_changed` payload 구조가 더 다양해질 경우 상태 정규화 규칙을 추가로 보강할 여지가 있습니다.
- 관리자 웹훅 로그는 프론트 페이지네이션을 먼저 적용했고, 백엔드 limit/offset 기반 페이지네이션은 다음 단계입니다.
- 심사자 시연용 운영 DB는 정리 스크립트까지 준비돼 있으며, 실제 운영 적용은 백업 후 단계적으로 반영할 계획입니다.
- 환불, 실제 송금, 크리에이터별 차등 가격 정책은 이번 과제 범위에서 제외했습니다.
- 브라우저 기반 회귀 테스트를 CI까지 완전히 올리지는 못해, 일부 핵심 흐름은 수동 smoke test 비중이 남아 있습니다.
- 주문 실패 / 취소 / 삭제 같은 상태 전이를 문서와 테스트로 더 촘촘히 고정할 여지가 있습니다.

## AI 사용 안내

- AI는 제품 방향 정리, UI 카피 초안, 구현 아이디어 탐색, 코드 리팩터링 보조 도구로 활용했습니다.
- 최종 동작과 결과는 직접 실행, 테스트, Swagger 확인, 브라우저 검증으로 점검했습니다.
