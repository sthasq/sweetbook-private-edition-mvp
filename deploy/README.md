# Sweetbook Demo Deployment

`gscheon.com/sweetbook-demo` deployment uses GitHub Actions plus remote Docker Compose on the OCI host.

## GitHub secrets

- `SWEETBOOK_DEMO_DEPLOY_KEY`: private SSH key that can log in to `opc@138.2.120.43`
- `SWEETBOOK_DEMO_ENV_FILE`: full contents of the production `.env.production` file

## One-time server bootstrap

1. Sync this repository to `/home/opc/apps/sweetbook-demo`
2. Place the production env file at `/home/opc/apps/sweetbook-demo/.env.production`
3. Run `chmod +x deploy/*.sh frontend/docker-entrypoint.d/40-configure-app-base.sh`
4. Run `./deploy/deploy.sh .env.production`

The deploy script updates the nginx include for `/sweetbook-demo`, reloads nginx, and starts the production compose stack.
