# Private Edition MVP

Private Edition is a creator-certified fan merch service built for the Sweetbook Book Print API assignment. A creator publishes an official edition once, and each fan personalizes that approved edition with their own nickname, relationship timeline, favorite moment, and shipping information before generating and ordering a printed book.

## Why this project

- It uses both **Books API** and **Orders API** in one end-to-end flow.
- It includes a real **end-user UI** instead of a raw API test page.
- Sensitive keys stay on the **Spring Boot backend**, never in the React client.
- It supports **Demo mode** out of the box, so reviewers can run the app even before wiring Google OAuth.
- It is shaped like an **official merch product**, not just a generic photobook generator.

## Target users

- Creators who want to launch a limited, official anniversary or fan-event book drop
- Fans who want a personalized keepsake with official creator curation
- Internal reviewers who need a reproducible local demo with sample data

## Core experience

1. A creator publishes an official edition snapshot.
2. A fan chooses the edition in Demo mode or connects YouTube.
3. The fan fills personalization fields and checks the preview.
4. The backend generates a Sweetbook book draft, adds cover and contents, finalizes it, estimates shipping, and creates an order.

## Stack

- Frontend: React 19 + Vite + TypeScript + Tailwind CSS
- Backend: Spring Boot 3.5 + Java 17 + Spring Data JPA + Flyway + Swagger
- Database:
  - Local development: MySQL 8 by default
  - Test / fallback: H2 in-memory profile
  - Docker: MySQL 8
- Infra: Docker Compose + nginx
- External APIs:
  - Sweetbook Books API
  - Sweetbook Orders API
  - Google OAuth 2.0
  - YouTube Data API v3

## Repository structure

```text
.
├── backend
│   ├── Dockerfile
│   ├── build.gradle
│   ├── run_local.ps1
│   └── src
│       ├── main/java/com/privateedition
│       ├── main/resources
│       │   ├── application.yml
│       │   ├── application-local.yml
│       │   ├── application-docker.yml
│       │   └── db/migration
│       └── test/java/com/privateedition
├── frontend
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── src
├── docker-compose.yml
├── .env.example
└── README.md
```

## Modes

### Demo mode

- No Google OAuth required
- Email/password app login is required before creating or resuming a project
- Uses seeded creator / edition / project data
- Sweetbook calls fall back to simulated responses when no API key is configured

### YouTube mode

- Email/password app login + Google OAuth connection
- Subscription list and channel recap data
- Top videos and channel detail are pulled from YouTube Data API

## Local setup

### 1. Copy environment variables

```powershell
.\init_env.ps1
```

Fill in at least:

- `SWEETBOOK_API_KEY` for live Sweetbook sandbox calls
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `YOUTUBE_API_KEY`

If Google values are omitted, the app still works in Demo mode.

### 2. Run backend locally

Local backend runs against Docker MySQL on `localhost:3306` by default so data persists across restarts.

```powershell
cd backend
$env:SWEETBOOK_API_KEY="your_sweetbook_key"
$env:SWEETBOOK_ENABLED="true"
$env:GOOGLE_CLIENT_ID="your_google_client_id"
$env:GOOGLE_CLIENT_SECRET="your_google_client_secret"
$env:GOOGLE_REDIRECT_URI="http://localhost:3000/oauth/google/callback"
$env:YOUTUBE_API_KEY="your_youtube_api_key"
.\run_local.ps1
```

If `SWEETBOOK_API_KEY` is missing, the backend automatically stays in demo/simulated mode.
If port `3306` is already occupied by a local MySQL service, stop that service first so Docker can bind the port.

### 2-1. Run backend locally with H2 instead

If you want a temporary in-memory database instead of persisted MySQL storage, switch the script to H2 explicitly.

```powershell
cd backend
.\run_local.ps1 -Database h2
```

For MySQL mode, the script starts `docker compose up -d mysql` automatically, then reads `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USERNAME`, and `MYSQL_PASSWORD` from `.env`. By default it connects to `localhost:3306/private_edition`.

### 3. Run frontend locally

```powershell
cd frontend
npm install
npm run dev
```

Vite runs on [http://localhost:3000](http://localhost:3000) and proxies `/api` requests to `http://localhost:8080`.

### 4. Useful URLs

- Frontend: [http://localhost:3000](http://localhost:3000)
- Swagger UI: [http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)
- H2 console (local profile only): [http://localhost:8080/h2-console](http://localhost:8080/h2-console)

### 5. Demo accounts

These accounts are for local review only.

- Fan: `fan@privateedition.local` / `Fan12345!`
- Creator: `creator@privateedition.local` / `Creator123!`

Landing and edition detail pages are public, but project creation, My Projects, YouTube connection, and Creator Studio require login.

## Docker setup

### 1. Copy environment variables

```powershell
.\init_env.ps1
```

### 2. Run the full stack

```powershell
docker compose up --build
```

### 3. Access the app

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:8080](http://localhost:8080)
- Swagger UI: [http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)

## Required environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `SWEETBOOK_ENABLED` | Recommended | Turns live Sweetbook mode on when used with a key |
| `SWEETBOOK_API_KEY` | For live mode | Sweetbook sandbox API key |
| `SWEETBOOK_BASE_URL` | Optional | Defaults to Sweetbook sandbox base URL |
| `MYSQL_ROOT_PASSWORD` | Docker only | MySQL root password for Compose maintenance |
| `MYSQL_HOST` | Local MySQL mode | Host for `.\run_local.ps1 -Database mysql` |
| `MYSQL_PORT` | Local MySQL mode | Port for `.\run_local.ps1 -Database mysql` |
| `MYSQL_DATABASE` | Local MySQL mode | Database name for `.\run_local.ps1 -Database mysql` |
| `MYSQL_USERNAME` | Local MySQL mode | App DB username for `.\run_local.ps1 -Database mysql` |
| `MYSQL_PASSWORD` | Local MySQL mode | App DB password for `.\run_local.ps1 -Database mysql` |
| `GOOGLE_CLIENT_ID` | YouTube mode | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | YouTube mode | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | YouTube mode | Must match the Google OAuth redirect URI |
| `YOUTUBE_API_KEY` | Recommended | Public YouTube Data API access / fallback |

## API usage

### Sweetbook APIs

| API | Endpoint usage | Role in project |
| --- | --- | --- |
| Books API | `GET /book-specs` | Load supported book specs |
| Books API | `GET /templates` | Find usable cover / content templates |
| Books API | `POST /books` | Create a draft book |
| Books API | `POST /books/{bookUid}/cover` | Add officialized cover data |
| Books API | `POST /books/{bookUid}/contents` | Add recap / fan pages |
| Books API | `POST /books/{bookUid}/finalization` | Finalize the printable book |
| Orders API | `POST /orders/estimate` | Show shipping estimate |
| Orders API | `POST /orders` | Create the final order |

### App endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/auth/signup` | Register a fan or creator account and start a session |
| `POST` | `/api/auth/login` | Log in with email/password |
| `POST` | `/api/auth/logout` | End the current session |
| `GET` | `/api/auth/me` | Get the current authenticated user |
| `GET` | `/api/me/projects` | List the current user's saved projects |
| `GET` | `/api/editions` | Published edition list |
| `GET` | `/api/editions/{id}` | Edition detail |
| `POST` | `/api/studio/editions` | Create creator edition |
| `PATCH` | `/api/studio/editions/{id}` | Update creator edition |
| `POST` | `/api/studio/editions/{id}/publish` | Publish official snapshot |
| `POST` | `/api/projects` | Create fan project |
| `PATCH` | `/api/projects/{id}` | Update personalization |
| `GET` | `/api/projects/{id}/preview` | Preview merged official + personal pages |
| `POST` | `/api/projects/{id}/generate-book` | Generate Sweetbook book |
| `POST` | `/api/projects/{id}/estimate` | Estimate order price |
| `POST` | `/api/projects/{id}/order` | Create order |
| `GET` | `/api/youtube/auth-url` | Build Google OAuth URL |
| `POST` | `/api/youtube/callback` | Exchange code and store session |
| `GET` | `/api/youtube/subscriptions` | List user subscriptions |
| `GET` | `/api/youtube/channels/{channelId}/top-videos` | Get top videos |
| `POST` | `/api/youtube/analyze` | Build recap payload |

## Seed data

The backend ships with Flyway seed data:

- Fictional verified creator: `온도로그`
- Published editions:
  - `2nd Anniversary Private Edition`
  - `Fan Letter Archive`
  - `Milestone Recap Edition`
- Curated assets and personalization schemas for each template
- Sample fan projects in multiple states: `DRAFT`, `PERSONALIZED`, `ORDERED`
- Local demo fan / creator accounts for auth + RBAC review

## Testing

### Backend

```powershell
cd backend
.\gradlew.bat test
```

### Frontend

```powershell
cd frontend
npm run lint
npm run build
```

## Design intent

- **Officiality first**: creator-approved snapshot is separated from fan personalization.
- **Submission completeness over feature sprawl**: one working flow is better than many half-finished experiments.
- **Demo-first**: the reviewer should see the product story even without full Google OAuth setup.
- **Backend-controlled secrets**: all external API keys remain server-side.

## Business potential

Private Edition sits between official creator merch and personal keepsake printing. Existing creator merch is usually identical for all fans, while generic photobook tools lack official creator approval. This project explores a premium middle ground: a creator publishes an official drop once, then every fan receives a private-feeling personalized variant of that approved edition.

This makes the product fit anniversary drops, comeback drops, fan meeting goods, and limited creator collaborations better than a plain photobook service.

## AI usage log

- Used AI to refine product positioning, naming, copy direction, and implementation sequencing
- Used AI to scaffold and iterate backend / frontend integration points
- Verified API contracts and runtime behavior manually with local execution, tests, Swagger checks, and request flow inspection

## Known limitations

- Real creator verification is mocked with seeded data in this MVP
- YouTube mode depends on local Google Cloud Console setup
- Webhooks and payment settlement are out of scope for v1
- Public release requires secret rotation and a final public-repo hygiene pass
