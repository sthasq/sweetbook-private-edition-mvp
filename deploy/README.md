# Sweetbook Demo Deployment

`gscheon.com/sweetbook-demo` deployment uses GitHub Actions plus remote Docker Compose on the OCI host.

## Deployment policy

- Routine production deployment uses [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) only.
- Local Windows PowerShell one-liner deployment is intentionally excluded to avoid Windows Defender heuristic detections and environment drift.
- The OCI host runs the stack with `docker compose` and `.env.production`.

## GitHub secrets

- `SWEETBOOK_DEMO_DEPLOY_KEY`: private SSH key that can log in to `opc@138.2.120.43`
- `SWEETBOOK_DEMO_ENV_FILE`: full contents of the production `.env.production` file

## Routine deploy flow

1. Push the target commit to `codex/private-edition-mvp-progress`, or run the deploy workflow manually from GitHub Actions.
2. GitHub Actions validates backend tests, frontend lint, and frontend production build.
3. The workflow syncs the repository to `/home/opc/apps/sweetbook-demo` on the OCI host.
4. The workflow uploads `.env.production`, runs `./deploy/deploy.sh .env.production`, and performs the smoke test.

## One-time server bootstrap

1. Sync this repository to `/home/opc/apps/sweetbook-demo`.
2. Place the production env file at `/home/opc/apps/sweetbook-demo/.env.production`.
3. Run `chmod +x deploy/*.sh frontend/docker-entrypoint.d/40-configure-app-base.sh`.
4. Run `./deploy/deploy.sh .env.production`.

The deploy script updates the nginx include for `/sweetbook-demo`, reloads nginx, and starts the production compose stack.

## Reviewer demo data curation

Use [`deploy/sql/curate_reviewer_demo_state.sql`](./sql/curate_reviewer_demo_state.sql) only when the reviewer-facing demo data has become noisy.

### Target reviewer state

- demo fan projects: `1~2`
- customer orders: `1`
- progressed fulfillment example: `1`
- admin webhook rows: `1~2`

### Apply flow

1. Backup the production database before touching reviewer data.
2. Review the SQL once and confirm the keep/delete scope matches the current demo accounts.
3. Apply `deploy/sql/curate_reviewer_demo_state.sql`.
4. Verify the fan, creator, and admin accounts can still demonstrate the expected flows.

### Verify after apply

- `fan@playpick.local` keeps one completed or demonstrable order flow.
- creator/admin accounts remain present and readable.
- webhook rows left in `sweetbook_webhook_event` are tied to the kept order UID.
- admin pages read as a compact reviewer demo instead of an operations backlog.
