# PlayPick

> 스위트북 바이브코딩 풀스택 개발자 과제 (Book Print API 웹앱 만들기)
> 실제 프로덕트를 만든다는 관점에서 기획, 디자인, 풀스택 구현 및 배포까지 E2E로 완성했습니다.

## 1. 서비스 소개

과제가 요구하는 '콘텐츠를 책으로 만드는 경험'을 살려 기획했습니다.

- **어떤 서비스인지**: 크리에이터(인플루언서)가 제공한 에디션(테마)을 바탕으로, 팬이 AI와 대화하며 자신만의 맞춤형 포토북 굿즈를 손쉽게 만들고 주문하는 플랫폼입니다.
- **누구를 위한 서비스인지**: 
  - **크리에이터(인플루언서)**: 자신만의 브랜드나 IP로 특별한 굿즈를 기획하고, 재고 부담이나 물류 허들 없이 수익을 창출하고 싶은 창작자.
  - **팬(고객)**: 크리에이터와의 1:1 대화 같은 특별한 경험을 통해, 번거로운 편집 툴 조작 없이 세상에 하나뿐인 실물 포토북을 소장하고 싶은 사람.
- **주요 기능 목록**:
  - **[팬] AI 채팅 인터뷰**: 복잡한 사진 업로드 및 편집 툴 대신, AI와의 자연스러운 대화(채팅)를 통해 포토북에 들어갈 텍스트와 큐레이팅할 이미지를 개인화합니다.
  - **[팬] 실감형 3D 포토북 미리보기**: `react-pageflip`을 적용해 실제 포토북의 물성(표지, 내지 래핑)을 웹에서 완벽히 재현한 미리보기 경험을 제공합니다.
  - **[팬] E2E 주문 흐름 완결**: 인쇄 확정 ➡️ 배송지 입력 및 배송비 추정 ➡️ 결제(Toss) ➡️ Sweetbook 실제 주문 접수까지 매끄럽게 이어집니다.
  - **[크리에이터] 스튜디오 대시보드**: 자신만의 에디션을 기획 및 공개하고, 팬들의 주문 현황을 확인할 수 있습니다.
  - **[관리자] 운영 및 정산 모니터링**: Sweetbook 웹훅 수신 내역 실시간 모니터링, 실제 제작 원가(Vendor Cost)와 플랫폼 서비스 마진(Margin)을 분리 집계하는 정산 대시보드.

## 2. 실행 방법

본 프로젝트는 평가 환경 서버 구축 비용을 최소화하기 위해 Docker 기반으로 로컬에서 바로 전체 서비스를 띄울 수 있도록 구성했습니다.  
(더미 데이터와 **체험 모드**를 지원하므로, API 키를 채우지 않더라도 핵심적인 전체 이용 흐름—에디션 탐색 ➡️ AI 인터뷰 ➡️ 미리보기 ➡️ 주문—을 바로 시연해 볼 수 있습니다.)

### 설치
(Docker Desktop 환경이라면 별도의 npm, java 설치 및 빌드 과정 없이 아래의 명령어만으로 자동 빌드 및 컨테이너가 배포됩니다.)

### 환경변수 설정
```bash
# 1. 환경변수 템플릿 복사
cp .env.example .env

# 2. .env 파일에 API Key 입력
# .env.example 기본값으로 체험 모드가 활성화되어 있습니다.
# (외부 연동을 완벽히 하려면 SWEETBOOK_API_KEY, OPENROUTER_API_KEY 및결제 키 입력 필요)
```

### 실행
```bash
# 백그라운드로 통합 환경(React 19 + Spring Boot 3.5 + MySQL 8 + Redis 7) 띄우기
docker compose up --build -d
```

- **데모 프론트엔드 서비스 (팬 및 운영 홈)**: [http://localhost:3000](http://localhost:3000)
- **로컬 Swagger API 명세**: [http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)

**미리 생성된 데모 연동 계정** (가입 없이도 핵심 흐름 확인 가능):
| 역할 | 이메일 | 비밀번호 |
| --- | --- | --- |
| **팬** (개인화/주문 테스트) | `fan@playpick.local` | `Fan12345!` |
| **크리에이터** (에디션 운영) | `creator@playpick.local` | `Creator123!` |
| **관리자** (정산/웹훅 모니터링) | `admin@playpick.local` | `Admin12345!` |

*(설치가 어려우시다면 퍼블릭 데모 환경: **[https://gscheon.com/sweetbook-demo/](https://gscheon.com/sweetbook-demo/)** 에서도 즉시 확인하실 수 있습니다.)*

## 3. 사용한 API 목록

Book Print API 연동을 사용자 경험 측면에서의 실제 제품 흐름과 정확히 1:1로 매핑하여 사용했습니다.

| API 용도 | Book Print API 엔드포인트 | 상세 설명 |
| --- | --- | --- |
| **템플릿 상세 레이아웃 탐색** | `GET /templates/{templateUid}` | 사용 가능한 프론트엔드 미리보기를 위해 에디션의 원본 페이지 구조 파악 |
| **템플릿 목록 및 사양 탐색** | `GET /templates` | 전체 책 사양별 제작 가능 템플릿 구조 탐색 모듈 |
| **신규 포토북 세션 활성화** | `POST /books` | 팬이 AI 채팅을 마친 뒤, 개인화 뷰(미리보기) 화면에 진입할 때 기반을 둘 빈 책(bookUid) 발급 생성 |
| **표지 그래픽 정보 반영** | `POST /books/{uid}/cover` | 에디션의 시드 정보와 더불어 AI 대화로 수집된 개인화 정보를 표지(cover) 구성 스펙에 맞춰 전달 |
| **내지 구성 및 구조 반영** | `POST /books/{uid}/contents` | 각 내부 페이지(스프레드)별로 AI 생성 텍스트, 큐레이션 이미지, 기본 레이아웃 구성 맵 반영 전달 |
| **최종 인쇄 확정 픽업** | `POST /books/{uid}/finalization` | 팬이 화면에서 '인쇄용으로 확정하기' 클릭 시 편집 상태 잠금 처리 |
| **배송비 추정 / 총결제액 산출** | `POST /orders/estimate` | 팬이 입력한 배송지 정보를 통한 배송비 실시간 산출 및 PG 결제에 넘길 정확한 결제 원금 파악 |
| **실 주문 제작 발주** | `POST /orders` | PG(Toss) 결제 승인 거래가 확인되는 즉시 (멱등성 보장) 플랫폼 수익 마감 분리 등과 함께 발주 요청 |
| 주문 상태 웹훅 트래킹 | *(Webhook)* `POST /api/sweetbook/webhook` | Sweetbook측 제작 상태 변경 이벤트를 실시간으로 전달받음. (**`X-Webhook-Signature` 기반 HMAC 서명 검증** 등 완벽한 인가 절차 구현) |

## 4. AI 도구 사용 내역

다양한 AI 도구를 빠르고 적절하게 (초안 스캐폴딩 생성기와 대안 탐색 파트너로) 목적에 맞게 활용했습니다.

| AI 도구명 | 구체적 활용 내용 |
| --- | --- |
| **Codex** / **Cursor AI** | Spring Boot 3 + MySQL 백엔드 통합 API 라우팅 레이어 설계 지원, 주요 영속성 도메인 객체 구현 및 데이터베이스 마이그레이션 스크립트 도출, 복잡한 상태 머신 기반(최종화 로직 등) 흐름 처리 지원 |
| **Google Stitch / 안티그래비티** | 프론트엔드 내 채팅 인터페이스 모듈, `react-pageflip` 적용 뷰어 뼈대 등 UI 파일럿 초안 생성 |
| **Claude** / **Gemini** | UX Writing 문구 다듬기, 포토북 가상 인플루언서 카피 및 시드 더미 데이터 도출. 나아가 웹훅 보안 흐름 및 트랜잭션 충돌 해결, 정산 논리 구성 등에서 대안을 토론하는 파트너 역할 수행 |
| **VS Code Copilot** | 에디터 내부에서의 즉각적인 빠른 자동완성과 부분적 리팩터링 및 에러 픽스 보조 도구로써 활용 |

*(작업 과정에서의 의사결정과 AI 생성 맥락의 혼선을 방지하기 위해, 매번 Obsidian 지식베이스에 회고를 별도 텍스트로 기록하고 이를 AI의 프롬프팅 문맥으로 삼으며 일관성 있게 협업했습니다.)*

## 5. 설계 의도

### 왜 이 서비스를 선택했는지
API를 단순 연결해 데스크용 데모를 만드는데 그치지 않고, **"Book Print API가 실제 최종 사용자 고객이 있는 비즈니스 흐름 내에서 만들어내는 경험적 파급력"**을 증명하는 것을 최우선으로 삼았습니다. 
특히 포토북 제작의 가장 큰 허들인 '사진 선별과 복잡한 레이아웃 편집 제어'를 회피하고자 했습니다. 크리에이터가 기본 뼈대인 에디션을 잡아주고 팬은 폼이나 편집기 조작 없이, **AI와의 단순한 채팅 인터뷰만으로 자연스레 감정과 텍스트를 채워가며 고품질의 한정판 포토북을 생성해내는 구조**가 이 API의 실효성을 시장에서 극대화시킬 것이라고 확신했습니다.

### 이 서비스의 비즈니스 가능성을 어떻게 보는지
시장 지불 용의가 매우 높은 "팬덤 맞춤형 한정판 굿즈" 비즈니스의 특성과 Book Print API가 제공하는 "소량 주문형(POD) 인쇄"의 강점을 정면으로 결합했습니다. 재고를 떠안기 싫은 기획사와 희소성 있는 굿즈를 원하는 타겟 고객의 니즈를 동시에 만족시킵니다. 
이를 증명하기 위해 흔하고 두루뭉술한 매출액 배분 로직 대신 개발 초기 단계부터 시장 플랫폼 사업자의 현실을 반영하여, **실제 제작 원가(Sweetbook Vendor Cost)와 플랫폼 서비스 고유 마진(Margin)을 직관적으로 엄격히 분리한 구조로 데이터 모델 및 플랫폼 대시보드를 구축**했습니다.

### 더 시간이 있었다면 추가했을 기능
- **통합 원자적 환불 보상 시스템 정교화**: Toss PG 사이드의 결제 자동 취소 워크플로우와 Sweetbook API 상의 외부 제작/발주 취소 액션을 연계하여, 실패된 시스템 주문이나 사용자의 취소가 일어날 때 SAGA 패턴 방식으로 완벽한 롤백을 수행하는 파이프라인.
- **크리에이터별 차등 및 유동적 티어링 가격 시스템**: 크리에이터의 팬덤 크기나 에디션의 가치 수준에 비례해, 원가를 제외한 서비스별 고유 부가 마진율(Premium)을 유연하게 개별 부여하는 정책.
- **브라우저 기반 E2E 단위 회귀/격리 테스트 CI 고도화**: 전체 주문 플로우를 CI/CD 런타임상에 올려 Playwright 통제 기반 E2E 사이클이 통과되어야만 데모 배포 승인이 발생하도록 커버리지 확장. (현재 부분적 스크립테스트 운용 수준 보강)
# PlayPick

> Sweetbook 채용과제를 위해 만든 AI 채팅 인터뷰 기반 포토북 개인화 플랫폼

PlayPick은 크리에이터가 공개한 공식 에디션을 팬이 AI 채팅 인터뷰로 개인화하고, 실제 포토북 생성과 주문까지 이어지는 풀스택 서비스 데모입니다. Sweetbook Books API와 Orders API를 제품 흐름 안에 녹여냈고, FAN / CREATOR / ADMIN 세 역할을 분리해 사용자 경험과 운영 관점이 함께 보이도록 설계했습니다.

이 프로젝트는 기능을 넓게 나열하기보다, 아래 한 개의 end-to-end 흐름을 설득력 있게 완성하는 데 집중했습니다.

`에디션 탐색 -> AI 채팅 인터뷰 -> 미리보기 -> 인쇄 확정 -> 배송/결제 -> 주문 추적`

## 빠른 링크

- 데모 배포: [https://gscheon.com/sweetbook-demo/](https://gscheon.com/sweetbook-demo/)
- 로컬 Swagger UI: `http://localhost:8080/swagger-ui/index.html`
- 예시 환경 변수: [`.env.example`](./.env.example)
- 운영 배포 설정: [`deploy/README.md`](./deploy/README.md)

## 화면 미리보기

| 홈 | 팬 미리보기 | 크리에이터 대시보드 |
| --- | --- | --- |
| ![홈 화면](./output/playwright/submission/01-home.png) | ![팬 미리보기](./output/playwright/submission/02-fan-preview.png) | ![크리에이터 대시보드](./output/playwright/submission/04-creator-dashboard.png) |

## 주요 설계 및 구현 포인트

| 영역 | 구현 내용 |
| --- | --- |
| **제품 시나리오 정의** | `공식 에디션 + 팬 개인화`라는 구체적인 프로덕트 구조를 설정하여 Sweetbook API 연동의 현실성 확보 |
| **풀스택 아키텍처** | React 19 + Vite 프론트엔드, Spring Boot 3.5 백엔드, MySQL / Redis 통합 구성 |
| **신뢰성 있는 외부 연동** | Sweetbook API 호출 시점을 실제 사용자 여정과 1:1로 매핑하고, 결제 성공 후 외부 발주에 실패할 경우 재시도가 가능한 상태 기계(State Machine) 설계 |
| **사용자 중심 UX** | 긴 입력 폼 대신 AI 채팅 인터뷰를 중심 인터페이스로 도입, `react-pageflip`을 활용하여 실제 책의 물성(표지-내지 래핑)을 반영한 미리보기 뷰어 적용 |
| **현실적인 비즈니스 모델** | 단순 매출 분할이 아닌 `제작 원가(Vendor Cost) + 서비스 마진(Margin)` 구조를 적용하고, 주문 시점의 스냅샷으로 정산 데이터의 무결성 보장 |
| **보안 및 상태 격리** | 세션 인증 기반 CSRF 방어, Sweetbook 웹훅 HMAC 서명 검증 로직 추가, 서비스 내부 주문 상태와 외부 API 발주 상태의 격리 관리 |
| **유연한 배포 환경 지원** | 프론트엔드 `APP_BASE_PATH` 빌드 인자와 Nginx 서브패스 라우팅으로 단일 이미지를 다양한 배포 환경에서 재사용할 수 있도록 CI/CD 및 인프라 구성 |

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
| **팬** | 에디션 탐색 -> AI 채팅 인터뷰 -> 미리보기 -> 인쇄 확정 -> 배송/결제 -> 주문 | 대화형 개인화, Sweetbook 포토북 생성, Toss 결제, 주문 상태 추적 |
| **크리에이터** | 에디션 제작/공개 -> 주문 확인 -> 제작 상태 확인 | 스튜디오 플로우, 공개/비공개 관리, 프로젝트(에디션) 편집 흐름 |
| **관리자** | 전체 매출 / 원가 / 정산 / 웹훅 / 사용자 관리 | 운영용 대시보드, 마진/원가/플랫폼/크리에이터 정산액 분리 집계 |

## 핵심 기능

### 1. 팬 경험을 AI 채팅 인터뷰 중심으로 재구성

- 사용자는 긴 폼을 채우는 대신 대화에 답하면서 닉네임, 추억, 메시지, 이미지 구성을 자연스럽게 완성합니다. (클릭형 Suggested Replies 적용)
- 서버는 OpenRouter 기반 응답을 개인화 제안서 형태로 정규화하고, 그 결과를 미리보기와 주문 단계로 이어줍니다.

### 2. Sweetbook API를 실제 제품 흐름에 맞춰 연결

| 단계 | Sweetbook / 외부 API | 사용 시점 |
| --- | --- | --- |
| 포토북 생성 | `POST /books` | 미리보기 진입 시 책 생성 |
| 표지 구성 | `POST /books/{uid}/cover` | 에디션 + 개인화 정보로 표지 반영 |
| 내지 구성 | `POST /books/{uid}/contents` | 페이지별 콘텐츠 반영 |
| 인쇄 확정 | `POST /books/{uid}/finalization` | 사용자가 제작 확정을 누를 때 |
| 배송비 추정 | `POST /orders/estimate` | 배송지 입력 후 예상 금액 계산 |
| 주문 생성 | `POST /orders` | 결제 승인 후 실제 주문 접수 |

```text
[Edition 탐색]
      ↓
[AI 채팅 인터뷰]
      ↓
[미리보기 (react-pageflip 기반 판형 렌더링)]
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
| **서브패스 배포 대응** | 로컬과 운영 배포를 같은 코드베이스로 유지하고, `/sweetbook-demo` 같은 경로에서도 동작하게 하기 위해 |

### 주요 폴더

```text
.
├── backend/               # Spring Boot API, 도메인, 마이그레이션, 테스트
├── frontend/              # React SPA, 페이지, 공통 컴포넌트, API 클라이언트
├── deploy/                # 운영 배포 스크립트와 nginx 설정
├── docs/                  # 보조 문서와 회고
├── docker-compose.yml     # 로컬 통합 실행
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

## 로컬 실행

### 사전 요구사항

- Docker Desktop
- Java 17+
- Node.js 20+

### 1. 환경 변수 준비

```powershell
.\init_env.ps1
```

- `.env.example`을 `.env`로 복사하고, 기본값을 채워줍니다.
- `SWEETBOOK_API_KEY`, `TOSS_PAYMENTS_*`, `OPENROUTER_API_KEY`가 없어도 시드 데이터와 체험 모드로 핵심 흐름 확인이 가능합니다.
- 실연동을 테스트하려면 공개 HTTPS 주소와 관련 환경 변수를 추가로 설정해야 합니다. 자세한 값은 [`.env.example`](./.env.example)을 참고하면 됩니다.

### 2. 전체 실행

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

### 4. 분리 실행

```powershell
# MySQL + Redis
docker compose up mysql redis -d

# backend
cd backend
.\gradlew.bat bootRun

# frontend
cd frontend
npm install
npm run dev
```

## 검증 방법

### 자동 검증

```powershell
# backend
cd backend
.\gradlew.bat test

# frontend
cd frontend
npm ci
npm run lint
npm run build
```

GitHub Actions에서도 아래를 자동 검증합니다.

- backend test
- frontend lint
- frontend production build
- 데모 배포용 서브패스 빌드 검증

### 수동 확인 시 추천 흐름

1. 홈에서 공개 에디션을 확인합니다.
2. 팬 계정으로 로그인해 AI 채팅 인터뷰를 완료합니다.
3. 미리보기에서 포토북 생성과 인쇄 확정 단계를 확인합니다.
4. 크리에이터 계정으로 주문 대시보드를 확인합니다.
5. 관리자 계정으로 매출 / 정산 / 웹훅 화면을 확인합니다.

## 신뢰성과 운영성에서 신경 쓴 부분

- 세션 인증 환경에서 CSRF 토큰 발급과 자동 첨부 흐름을 넣었습니다.
- Sweetbook 라이브 연동 실패를 데모 성공처럼 숨기지 않고, 명시적 실패로 노출하도록 바꿨습니다.
- Sweetbook 웹훅은 `X-Webhook-Timestamp`와 `X-Webhook-Signature`를 검증한 뒤에만 상태를 반영합니다.
- 시드 데이터와 체험 모드를 제공해 평가자가 API 키 없이도 바로 흐름을 볼 수 있게 했습니다.
- 서브패스 배포, 운영용 compose, 배포 스크립트, CI/CD 워크플로를 함께 남겨 로컬 성공에만 의존하지 않도록 했습니다.

## 현재 한계와 다음 단계

- `ProjectService`, `StudioPage`처럼 책임이 큰 파일은 아직 추가 분리가 필요합니다.
- `order.status_changed` payload 구조가 더 다양해질 경우 상태 정규화 규칙을 추가로 보강할 여지가 있습니다.
- 환불, 실제 송금, 크리에이터별 차등 가격 정책은 이번 과제 범위에서 제외했습니다.
- 브라우저 기반 회귀 테스트를 CI까지 완전히 올리지는 못해, 일부 핵심 흐름은 수동 smoke test 비중이 남아 있습니다.
- 주문 실패 / 취소 / 삭제 같은 상태 전이를 문서와 테스트로 더 촘촘히 고정할 여지가 있습니다.

## AI 사용 안내

- AI는 제품 방향 정리, UI 카피 초안, 구현 아이디어 탐색, 코드 리팩터링 보조 도구로 활용했습니다.
- 최종 동작과 결과는 직접 실행, 테스트, Swagger 확인, 브라우저 검증으로 점검했습니다.
