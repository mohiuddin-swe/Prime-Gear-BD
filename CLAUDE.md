# Prime Gear BD — Custom Ecommerce Platform

Ecommerce store for Prime Gear BD (primegearbd.com): smart home, LED lighting, electronics and gadgets in Bangladesh.
Replaces the current WordPress + WooCommerce site. The backend is built so it can later become a multi-tenant
ecommerce operations SaaS (orders, courier, call center, inbox), so every business table carries `storeId`.

## Stack

- Monorepo: pnpm workspaces + Turborepo, TypeScript everywhere (strict mode)
- `apps/web`: Next.js (App Router), Tailwind CSS, shadcn/ui. Storefront + `/admin`
- `apps/api`: Express + TypeScript, REST under `/api/v1`, BullMQ workers
- `packages/db`: Prisma schema, migrations, seed (PostgreSQL)
- `packages/shared`: Zod schemas, shared types, constants (used by web and api)
- `packages/ui`: shared UI components and Tailwind preset
- Redis (cache, sessions, BullMQ), Meilisearch (product search), Cloudflare R2 (images)
- Local dev services via `docker-compose.yml` (postgres, redis, meilisearch)

## Commands

- `pnpm install` — install all workspaces
- `pnpm dev` — run web (3000) and api (4000) together
- `pnpm build` / `pnpm lint` / `pnpm typecheck` / `pnpm test`
- `pnpm db:migrate` — `prisma migrate dev` in packages/db
- `pnpm db:seed` — seed sample catalog
- `docker compose up -d` — start postgres, redis, meilisearch

## Rules

### General

- Small, focused changes. One feature per branch/commit. Run `pnpm typecheck && pnpm lint && pnpm test` before saying a task is done.
- Never commit secrets. All config through `.env` files, documented in `.env.example`.
- Ask before adding a new dependency that is not already in this file.

### Money and data

- Money is integer BDT (whole taka) in `Int` columns. Never floats.
- Phone is the customer's primary identity. Normalize BD numbers to `01XXXXXXXXX` (11 digits) in one shared helper.
- OrderItem snapshots name, SKU and price at purchase time.
- Every admin write creates an `AuditLog` row.
- Every business table has `storeId`.

### API (apps/api)

- Validate every request body, query and params with Zod schemas from `packages/shared`.
- Response shape: success `{ success: true, data, meta? }`, error `{ success: false, code, message }`.
- Lists paginate with `page` and `limit`, return `meta: { page, limit, total }`.
- Slow or external work (courier booking, SMS, Meta CAPI, image processing) runs as BullMQ jobs, never inside the request.
- Routes: `routes/` → `controllers/` → `services/` (business logic) → Prisma. No Prisma calls in controllers.
- Auth: customers by phone OTP; admins by email + password. JWT in httpOnly secure cookies. Admin roles: OWNER, MANAGER, CALL_AGENT, PACKER.
- Rate-limit public write endpoints (checkout, OTP, incomplete orders) per IP and per phone.

### Web (apps/web)

- MOBILE FIRST. Design at 360 px, then `md` (768) and `xl` (1280). No hover-only interactions.
- Server Components by default. `"use client"` only where needed (cart, gallery, checkout, filters).
- Tap targets at least 44 px, body text at least 16 px, inputs 16 px (no iOS zoom).
- Mobile: bottom navigation (Home, Categories, Search, Cart, Account); sticky order bar on product pages; filters in a bottom sheet; cart as a drawer.
- Images via `next/image` with `sizes`; only the first product image gets `priority`.
- Performance budget: LCP < 2.0 s, INP < 200 ms, CLS < 0.05, first-load JS < 150 KB gzipped.
- SEO: `generateMetadata` on every page, Product/Offer/BreadcrumbList JSON-LD, canonical URLs. Keep WooCommerce URL patterns: `/product/<slug>/`, `/product-category/<slug>/`.
- Currency display: `৳1,190` format via one shared formatter.

### Brand and UI (Prime Gear BD design system)

- All tokens live in `packages/ui/tailwind-preset.ts`. Never hard-code hex colors, fonts or radii in components.
- Logo: lightning-bolt icon in a dark rounded square + "PRIME GEAR BD" wordmark, SVG only, min 28 px tall in the mobile header. Tagline: "GEAR UP · LEVEL UP".
- Signature gradient: `linear-gradient(135deg, #1a56db, #0d3b8f)` for primary buttons, hero accents, selected bulk tiers.
- Colors:
  - brand-600 `#1a56db` (actions, links), brand-800 `#0d3b8f` (gradient end, hover), brand-50 `#eef4ff` (selected, info)
  - ink-950 `#0b1220` (dark showcase sections, footer), ink-900 `#111827` (body text on light)
  - surface `#f5f7fb` (page background, product image backdrop)
  - glow `#22d3ee` (small highlights on dark only, never body text)
  - deal `#f59e0b` (flash sale, % off badges, timers only)
  - success `#16a34a`, danger `#dc2626`
- Blue = action, amber = deals only, cyan = light accent on dark only. All text passes WCAG AA.
- Fonts via `next/font` (self-hosted): Plus Jakarta Sans 600–800 for headings, Inter 400–600 for body/UI, Hind Siliguri for Bangla. Prices bold, tabular numbers, in ink (not red).
- Style: dark glowing showcase sections (hero, category banners, smart-home blocks) + bright clean shopping grids. Cards white on surface, 16 px radius, soft blue-tinted shadow `0 4px 20px rgb(13 59 143 / 0.08)`. Buttons 12 px radius, 48 px tall on mobile.
- Icons: Lucide, stroke 1.75, 20/24 px. Motion: subtle (press lift, cart fly-in, skeletons), always respect `prefers-reduced-motion`.
- Product images 1:1 on light gray backdrop; lighting products also show a dark-room shot of the real light output.
- Before calling a UI task done, check it at 360 px, 768 px and 1280 px and against these rules.

### Tracking

- Existing pipeline stays unchanged: GTM web container → Cloudflare server-side tracking → Meta Conversions API, TikTok Events API, GA4. Do not replace it; the site only feeds the dataLayer.
- One `track()` helper pushes GA4-style ecommerce events to `window.dataLayer`: `view_item`, `add_to_cart`, `begin_checkout`, `generate_lead`, each with a unique `event_id` (browser and server events share it so Meta and TikTok deduplicate).
- `view_item` and `add_to_cart` contain exactly ONE item in `items[]`.
- PLACING AN ORDER = LEAD, not purchase. On order submit: Lead (Meta) / SubmitForm (TikTok) / generate_lead (GA4), fired from the browser AND from the Cloudflare server with the same `event_id`.
- PURCHASE fires ONLY when an admin confirms the order (status PENDING → CONFIRMED), SERVER-SIDE ONLY: a BullMQ job posts to the Cloudflare tracking endpoint (env), which sends Meta Purchase, TikTok CompletePayment, GA4 purchase.
  - Never fire Purchase from the admin dashboard browser (wrong IP, device, cookies).
  - Use the customer's data stored on the Order at checkout: client IP, user agent, `fbp`, `fbc`, `fbclid`, `ttclid`, `ttp`, `_ga` client id, hashed phone/name, `external_id` = customer id, `action_source: website`.
  - `event_id` = `purchase_<orderNumber>`; idempotent via `Order.purchaseSentAt` (send once even if confirmed twice).
  - Value = order total at confirmation, currency BDT. Cancelled orders never send Purchase.
  - Warn in admin if an order is confirmed more than 7 days after it was placed (outside the ad platforms' event window).
- Capture on landing/checkout and save on the Order: `fbclid`, `_fbp`, `_fbc`, `ttclid`, `_ttp`, `_ga`, client IP, user agent.
- User data (phone, name, district, external_id) only on checkout. Omit missing fields (undefined). Never send empty strings.
- Keep event names and payload shape stable so the GTM tags, Cloudflare worker and tracking dashboard keep working.

### Bangladesh specifics

- Checkout is COD-first, one page, guest allowed: name, phone, address, district (+ optional thana).
- Shipping fee: inside Dhaka vs outside Dhaka, configured in admin.
- Couriers: SteadFast and CarryBee first, then Pathao and RedX, behind one `CourierProvider` interface.
- Payments: COD, bKash, Nagad, SSLCommerz, behind one `PaymentProvider` interface.
- Order statuses: PENDING, CONFIRMED, PACKED, SHIPPED, DELIVERED, CANCELLED, RETURNED, PARTIAL_DELIVERED. Every change logged in `OrderStatusLog`.

## Reference

Full blueprint (architecture, schema, features, upsells, brand and UI system, mobile design, roadmap) is in the "Prime Gear BD — Custom Ecommerce Blueprint" doc. When a task needs a decision not covered here, ask.
