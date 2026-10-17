# Prime Gear BD

Ecommerce platform for primegearbd.com: Next.js storefront (`apps/web`), Express API (`apps/api`),
Prisma/PostgreSQL (`packages/db`). Project rules and the full command list are in [CLAUDE.md](CLAUDE.md).

## Run locally

```sh
pnpm install
docker compose up -d        # postgres, redis, meilisearch
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm db:migrate && pnpm db:seed
pnpm dev                    # web on :3000, api on :4000
```

## How the browser reaches the API

Browser code calls the API **same-origin** at `/api/v1/*`. `apps/web/next.config.ts` rewrites
those requests to `API_INTERNAL_URL` (default `http://localhost:4000`). Server components call
`API_INTERNAL_URL` directly. This means:

- The guest cart cookie (`pg_cart`) and admin cookie (`pg_admin`) are first-party on whatever host
  serves the site: httpOnly, `SameSite=Lax`, `Secure` only in production.
- The storefront needs no CORS. The API's `WEB_ORIGIN` only matters for callers on another origin.
- The site uses trailing slashes, so browser API paths end in `/` (`/api/v1/cart/`). The shared
  `call()` helper in `apps/web/src/lib/cart-api.ts` adds it; without it Next answers with a 308 redirect.
- The API takes the visitor IP from `CF-Connecting-IP` / `X-Forwarded-For`, which pass through the
  proxy. In production Cloudflare sets them. In local dev nothing does, so orders record `::1`.

## Admin

`/admin` (products, categories, brands) is for OWNER and MANAGER accounts. The seed prints the
owner's password once. Set `SEED_ADMIN_PASSWORD` before `pnpm db:seed` to choose it.

## Image uploads

The browser uploads straight to storage with a short-lived signed URL. The API only signs, then
checks the uploaded file before attaching it. `STORAGE_DRIVER` in `apps/api/.env` picks where
files go:

- `local` (the default, development only): files are written to `apps/api/uploads/` and served at
  `/uploads/*`, which the web app proxies like `/api/v1`. Nothing to set up.
- `r2` (required in production; the API refuses to start with `local` there): Cloudflare R2. Set
  the `R2_*` variables, add the `R2_PUBLIC_URL` host to the web's `IMAGE_HOSTS`, and add a CORS
  rule to the bucket so the browser can PUT from the site:
  ```json
  [{ "AllowedOrigins": ["https://primegearbd.com"], "AllowedMethods": ["PUT"], "AllowedHeaders": ["content-type"], "MaxAgeSeconds": 3600 }]
  ```

Removed or replaced images are deleted from storage by the `storage-delete` BullMQ worker
(`pnpm dev` runs the workers).

## Test on a phone (same WiFi)

1. Find your computer's LAN IP: `ipconfig getifaddr en0` (macOS) or `hostname -I` (Linux).
2. In `apps/web/.env.local`, set `DEV_ALLOWED_ORIGINS` to that IP, or a wildcard that survives DHCP
   changes:
   ```sh
   DEV_ALLOWED_ORIGINS=192.168.0.*
   ```
   Without it Next blocks the dev JavaScript and HMR for other hosts. Pages still render, but
   nothing hydrates, so buttons do nothing.
3. Restart `pnpm dev` (the variable is read when Next starts).
4. On the phone, open `http://<LAN-IP>:3000`. Only port 3000 needs to be reachable. If it doesn't
   load, allow incoming connections for Node in the macOS firewall.

Over plain-HTTP LAN the page is not a secure context, so browser APIs such as `crypto.randomUUID`
are missing. Use the `uuid()` helper in `apps/web/src/lib/utils.ts` instead.

## Tests

```sh
pnpm typecheck && pnpm lint && pnpm test
pnpm --filter @primegear/web test:e2e   # Playwright at 390 px; reuses running dev servers
```
