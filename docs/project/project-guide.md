# PlayPick Project Guide

이 문서는 PlayPick 저장소를 처음 보는 사람이 서비스 흐름과 구현 지점을 빠르게 확인할 수 있도록 만든 안내입니다.

## 1. 먼저 보면 좋은 것

| 순서 | 확인 항목 | 위치 |
| --- | --- | --- |
| 1 | 서비스가 풀려는 문제와 핵심 흐름 | [README.md](../../README.md) |
| 2 | 제품 판단과 구현 회고 | [playpick-case-study.md](playpick-case-study.md) |
| 3 | 로컬 실행 환경 | [../../.env.example](../../.env.example), [../../docker-compose.yml](../../docker-compose.yml) |
| 4 | 배포 흐름 | [../../deploy/README.md](../../deploy/README.md), [../../.github/workflows](../../.github/workflows) |

## 2. 라이브 데모 확인 동선

라이브 데모: <https://gscheon.com/sweetbook-demo/>

| 역할 | 이메일 | 비밀번호 | 확인 포인트 |
| --- | --- | --- | --- |
| 팬 | `fan@playpick.local` | `Fan12345!` | 에디션 탐색, AI 인터뷰, 프리뷰, 견적, 데모 주문 |
| 크리에이터 | `creator@playpick.local` | `Creator123!` | 스튜디오, 에디션 발행 흐름, 주문 현황 |
| 관리자 | `admin@playpick.local` | `Admin12345!` | 주문/정산, 사용자 관리, Sweetbook 웹훅 로그, SSE 스트림 |

추천 순서는 팬 흐름으로 주문까지 만든 뒤 관리자 화면에서 주문과 웹훅 관리를 확인하는 방식입니다.

## 3. 코드에서 확인하면 좋은 구현 지점

| 관심사 | 주요 파일 |
| --- | --- |
| Sweetbook 외부 API 클라이언트 | `backend/src/main/java/com/playpick/infrastructure/sweetbook/SweetbookClient.java` |
| 책 생성/확정/견적/주문 도메인 흐름 | `backend/src/main/java/com/playpick/application/SweetbookService.java`, `backend/src/main/java/com/playpick/application/ProjectService.java` |
| 웹훅 서명 검증과 멱등 처리 | `backend/src/main/java/com/playpick/api/SweetbookWebhookController.java`, `backend/src/main/java/com/playpick/application/SweetbookWebhookService.java` |
| 세션 인증, CSRF, Role 접근 제어 | `backend/src/main/java/com/playpick/config/SecurityConfig.java`, `frontend/src/components/RequireRole.tsx` |
| 팬 개인화 인터뷰 | `backend/src/main/java/com/playpick/application/ChatPersonalizationService.java`, `frontend/src/pages/ChatPersonalizationPage.tsx` |
| 포토북 프리뷰 | `backend/src/main/java/com/playpick/application/ProjectPreviewAssembler.java`, `frontend/src/pages/PreviewPage.tsx` |
| 관리자 실시간 웹훅 스트림 | `backend/src/main/java/com/playpick/application/AdminWebhookStreamService.java`, `frontend/src/lib/adminWebhookStream.ts` |

## 4. 검증 명령

```bash
# Backend
cd backend
./gradlew test --no-daemon

# Frontend
cd frontend
npm ci
npm run lint
npm run build
```

로컬 Docker 스택을 실행한 뒤에는 `frontend` 디렉터리에서 `npm run e2e:extended`로 팬, 크리에이터, 관리자 주요 흐름을 더 넓게 확인할 수 있습니다.

## 5. 프로젝트에서 강조하고 싶은 점

- 외부 인쇄 API를 단순 호출하는 데서 멈추지 않고 팬, 크리에이터, 관리자 역할이 있는 제품 흐름으로 풀었습니다.
- API Key가 없어도 전체 흐름을 확인할 수 있도록 Sweetbook, OpenRouter, Toss Payments 연동에 시뮬레이션 모드를 두었습니다.
- 웹훅은 단순 수신이 아니라 HMAC 서명 검증, timestamp 허용 범위, `delivery_uid` 기반 중복 처리, 관리자 SSE 스트림까지 구현했습니다.
- 주문 시점의 원가, 마진, 플랫폼 수수료, 크리에이터 정산액을 스냅샷으로 남겨 운영 데이터가 정책 변경에 덜 흔들리도록 설계했습니다.
