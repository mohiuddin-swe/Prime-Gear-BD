# Prime Gear BD — Claude Code Prompts (Step by Step)

Put `CLAUDE.md` and this file in the repo root. Do the steps in order.

## The loop for EVERY step

1. Type `/clear` (fresh context).
2. Press Shift+Tab until **plan mode** is on. Paste the step's prompt.
3. Read the plan. Push back if it adds things you didn't ask for. Approve.
4. Run it yourself: click through on your phone (or Chrome DevTools at 360 px). Read the diff.
5. Paste: `Run typecheck, lint and tests, fix anything failing.`
6. Paste: `Commit this with a conventional commit message.` Then push.

Tips: paste exact errors, not "it's not working". If it goes in circles twice, `/clear` and restart the step.
When a rule should apply forever, say: `Add this rule to CLAUDE.md: ...`

---

# PHASE 1 — MVP STORE

## Step 1 — Monorepo scaffold

```
Read CLAUDE.md. Set up the monorepo exactly as described there:
- pnpm workspaces + Turborepo with apps/web (Next.js App Router, TypeScript, Tailwind, shadcn/ui), apps/api (Express + TypeScript, tsx for dev), packages/db (Prisma), packages/shared (Zod + types), packages/ui.
- Root scripts: dev, build, lint, typecheck, test, db:migrate, db:seed.
- docker-compose.yml with postgres 16, redis 7, meilisearch, with named volumes.
- .env.example for each app, ESLint + Prettier shared config, Vitest in api and shared.
- apps/api has GET /api/v1/health returning { success: true, data: { status: "ok" } }.
- apps/web home page fetches /health and shows the status.
Do not build any features yet. Finish with the commands to run it and confirm pnpm dev works.
```

## Step 2 — Database schema

```
In packages/db, write the Prisma schema for Phase 1 following CLAUDE.md rules (storeId everywhere, money as Int taka):
Store, Category (nested via parentId), Brand, Product, ProductVariant, ProductImage, Attribute, AttributeValue,
Customer, Address, Cart, CartItem, Order, OrderItem, OrderStatusLog, Payment, Shipment, CourierAccount,
IncompleteOrder, BulkTier, UpsellRule, AdminUser, AuditLog, Setting (key/value per store), Redirect, TrackingEventLog.
Order keeps: phone, name, address, district, thana, subtotal, discount, shippingFee, total, paymentMethod, status, source,
and tracking fields: fbclid, fbp, fbc, ttclid, ttp, gaClientId, clientIp, userAgent, leadEventId, purchaseSentAt.
OrderItem snapshots productName, variantName, sku, unitPrice, upsellSource.
Add sensible indexes (slug, phone, status + createdAt). Create the first migration.
Seed: 1 store, 4 categories (Smart Home, LED Lighting, Gadgets, Accessories), 12 sample products with variants and placeholder images, bulk tiers on 3 products, one OWNER admin.
Show me an ER summary of the tables when done.
```

## Step 3 — API foundation

```
Build the Express API foundation in apps/api:
- Folder structure routes → controllers → services, a central error handler, AppError class, the response helpers from CLAUDE.md.
- validate(schema) middleware using Zod schemas from packages/shared.
- Pino logging with request IDs, helmet, CORS for the web origin, cookie-parser, rate limiter backed by Redis.
- Admin auth: POST /admin/auth/login, /logout, GET /admin/auth/me. bcrypt passwords, JWT in httpOnly cookie, requireAdmin(roles) middleware.
- BullMQ setup with a queues/ folder and a worker entry point (pnpm worker), plus an example job.
- Prisma client from packages/db; storeId resolved from a single default store via middleware (so it can become multi-tenant later).
Add Vitest + Supertest tests for health, login success, login failure, and a protected route.
```

## Step 4 — Catalog API + search

```
Add the public catalog API:
- GET /products (filters: category, brand, minPrice, maxPrice, inStock; sort: newest, price_asc, price_desc, bestselling; paginated)
- GET /products/:slug (variants, images, bulk tiers, related products from same category)
- GET /categories (tree) and GET /categories/:slug
- GET /search?q= using Meilisearch; sync products to the index on create/update via a BullMQ job, plus a full reindex script.
Cache product and category reads in Redis for 5 minutes, invalidated when admin updates a product.
Tests for filters, pagination, 404 on unknown slug.
```

## Step 5 — Brand design system and mobile-first layout

```
Build the Prime Gear BD design system and app shell, following the "Brand and UI" section of CLAUDE.md exactly. Mobile first (360px first).
1. packages/ui/tailwind-preset.ts with all brand tokens: brand-50/600/800, ink-900/950, surface, glow, deal, success, danger, the signature gradient as a utility (bg-brand-gradient), radii (card 16px, button 12px), the soft blue shadow. Wire it into apps/web.
2. Fonts via next/font: Plus Jakarta Sans (headings), Inter (body), Hind Siliguri (Bangla).
3. Logo component from my SVG (I'll paste it), sized for mobile header (28px) and desktop.
4. Components in packages/ui: Button (gradient primary, outline secondary, ghost; 48px tall on mobile), Price (৳ formatter, tabular numbers), DiscountBadge (amber), ProductCard (white card on surface, 1:1 image on light gray, badge, rating, price, quick add), TrustStrip (COD, delivery, warranty, WhatsApp icons — text as props), SectionDark (midnight background with soft blue/cyan glow), BottomSheet, Drawer, Skeleton. Lucide icons, stroke 1.75.
5. Layout: header (logo, search, cart count), mobile bottom navigation (Home, Categories, Search, Cart, Account; hidden from md up), footer on ink-950 with tagline "GEAR UP · LEVEL UP".
6. A /styleguide page showing every token and component, light and dark sections, at 360/768/1280.
Check contrast (WCAG AA), tap targets (44px+), reduced motion. Describe the styleguide at each width before finishing.
```

## Step 6 — Storefront pages with SEO

```
Build these pages as Server Components fetching from the API, with ISR (revalidate 300), using the Step 5 design system:
- Home: dark hero (product glowing in a dark room, headline + one CTA), horizontally scrolling category chips, flash-sale strip with amber timer, bestsellers grid, new arrivals, trust strip.
- Category page at /product-category/[slug]/: sticky sort + filter bar; filters in a bottom sheet on mobile; "Load more" pagination.
- Product page at /product/[slug]/: swipeable gallery with video support, price with compare-at and % off badge, variant selector, bulk tier cards (selectable, per-unit savings), "How it works" icon row, specs as icon rows in accordions, related products, sticky bottom bar on mobile with price + Order Now + Add to cart.
- Search results page.
For every page: generateMetadata, canonical URL, Open Graph image, Product + Offer + BreadcrumbList JSON-LD on product pages. Add sitemap.ts and robots.ts.
Run Lighthouse mobile on the product page and report LCP, CLS and JS size against the budget in CLAUDE.md.
```

## Step 7 — Cart, bulk tiers and first upsells

```
Implement the cart:
- API: guest cart by cookie id, POST /cart, PATCH /cart/items/:id, DELETE /cart/items/:id, merge into customer cart after login.
- Pricing service in the API (single source of truth): bulk tiers per product, subtotal, discount, shipping (inside/outside Dhaka from Setting), total. Unit-test it well.
- Web: cart drawer (slides in, not a separate page on mobile), quantity steppers, max 10 per product with a WhatsApp bulk-order prompt above that.
- Free-delivery progress bar at the top of the drawer, threshold from Setting.
- After add-to-cart, a bottom sheet shows up to 3 offers from UpsellRule (trigger = product or category) with one-tap add.
- Record upsellSource on items added from an upsell.
```

## Step 8 — COD checkout and incomplete orders

```
Build the one-page checkout (route /checkout), mobile first:
- Fields: name, phone (inputMode tel, BD format validation with the shared normalizer), full address, district (searchable bottom sheet with all 64 districts), optional thana, optional note.
- Order summary with items, discount, shipping, total pinned at the bottom on mobile. Payment: Cash on Delivery only for now.
- POST /checkout/quote recalculates totals server-side; POST /orders creates the order in a transaction (stock check, price snapshot, OrderStatusLog PENDING, customer upsert by phone).
- Save client IP and user agent on the Order from the request (behind Cloudflare: use CF-Connecting-IP).
- When name and phone are filled, save to POST /incomplete-orders (debounced); delete it when the order is placed.
- Thank-you page /order/[orderNumber] showing summary and next steps ("We will call you to confirm").
- Rate-limit order creation per phone and IP; block duplicate submits.
```

## Step 9 — Admin: products and media

```
Build /admin in apps/web (login page, protected layout, responsive: sidebar on desktop, bottom tabs on mobile), using the brand design system:
- Products list with search and status filter; create/edit form with variants, attributes, SEO fields, bulk tiers, upsell rules.
- Image upload to Cloudflare R2 via presigned URLs from the API, drag to reorder, alt text.
- Categories and brands CRUD.
- Every write logged to AuditLog.
shadcn/ui data tables on desktop, card lists on mobile.
```

## Step 10 — Admin: orders and call confirmation

```
Build the order management screen:
- Status tabs with counts (Pending, Confirmed, Packed, Shipped, Delivered, Cancelled, Returned), search by phone/order number, date filter.
- Mobile: each order as a card with one-tap Call (tel: link), Confirm, Cancel, No answer. Desktop: table with bulk select and bulk confirm.
- Order detail: items, customer history (previous orders and outcomes by phone), notes, full status timeline from OrderStatusLog, edit items/address before confirming.
- Incomplete orders tab with Call and Convert to order.
- All status changes go through ONE orderStatus service that validates allowed transitions and writes OrderStatusLog + AuditLog, and emits an internal "order.confirmed" event when PENDING -> CONFIRMED (Step 12 will hook the Purchase event onto it).
- Show a warning when confirming an order placed more than 7 days ago.
```

## Step 11 — Courier integration

```
Create a CourierProvider interface (createConsignment, bulkCreate, getStatus, cancel) and implement SteadFast and CarryBee using their official APIs.
- Admin: "Book courier" on a confirmed order (choose provider, COD amount prefilled), bulk booking for selected orders, print labels.
- Store consignment id and tracking code on Shipment; set order SHIPPED.
- Webhooks /webhooks/steadfast and /webhooks/carrybee verify the secret and update Shipment + order status (DELIVERED, RETURNED, PARTIAL_DELIVERED).
- A BullMQ job polls status for shipments without webhook updates every 6 hours.
Ask me for the API docs and credentials before writing provider code.
```

## Step 12 — Tracking: Lead on order, Purchase on admin approval

```
Implement tracking exactly per CLAUDE.md. My existing pipeline is GTM web container -> Cloudflare server-side tracking -> Meta CAPI, TikTok Events API and GA4. Do NOT replace it; the site feeds the dataLayer and the backend posts approved purchases to the same Cloudflare endpoint.

Event logic:
- Browsing: view_item, add_to_cart, begin_checkout via dataLayer, each with event_id; view_item and add_to_cart carry exactly one item.
- Order submitted = LEAD: push generate_lead (GTM maps to Meta Lead, TikTok SubmitForm) from the browser, and the Cloudflare server sends the same event with the same event_id for dedup. Save it as Order.leadEventId.
- Admin confirms order (PENDING -> CONFIRMED) = PURCHASE, SERVER ONLY: on the "order.confirmed" event, enqueue a BullMQ job that posts to my Cloudflare endpoint with event_id purchase_<orderNumber>, the customer's stored IP, user agent, fbp, fbc, fbclid, ttclid, ttp, _ga client id, hashed phone/name, external_id, value = confirmed total, currency BDT, action_source website. Never fire anything from the admin's browser.
- Idempotent: set Order.purchaseSentAt and skip if already sent. Cancelled orders send nothing.

Steps:
1. Ask me for my current WooCommerce dataLayer code from functions.php, my GTM variable names (DLV-, CJS- prefixes) and the payload format my Cloudflare worker accepts. Match them.
2. Capture fbclid, _fbp, _fbc, ttclid, _ttp, _ga at landing/checkout and save on the Order with IP and user agent.
3. Build track() and the purchase job with retries, logging every server event in TrackingEventLog (status, response).
4. Tell me exactly what to change in the Cloudflare worker so it accepts server-originated events with their own IP/user agent, and which GTM tags to change (Purchase tags on order submit become Lead tags).
5. Write TRACKING.md with every event, its payload, and how to verify in GTM preview, Meta Test Events and TikTok test events.
```

## Step 13 — Phase 1 QA

```
Do a Phase 1 review:
1. Run typecheck, lint, all tests; fix failures.
2. Playwright tests at 360px viewport: browse category → product → add to cart → accept an upsell → checkout COD (Lead pushed to dataLayer) → order appears in admin → confirm (Purchase job enqueued once, mock endpoint) → book courier (mock provider).
3. Lighthouse mobile on home, category, product, checkout; list anything over budget and fix it.
4. Brand check: every page against the Brand and UI rules in CLAUDE.md at 360/768/1280.
5. Security pass: auth on every admin route, rate limits, input validation, no secrets in client bundles.
Give me a checklist of what passed and what is left.
```

---

# PHASE 2 — PAYMENTS, FRAUD, UPSELLS, SMS

## Step 14 — Payment gateways

```
Create a PaymentProvider interface (initiate, verify, refund) and implement bKash (tokenized checkout), Nagad and SSLCommerz, sandbox first.
- Checkout payment options: COD, bKash, Nagad, Card/Other (SSLCommerz). Optional "pay delivery fee in advance" mode set per order by the fraud check.
- Payment rows track status (INITIATED, SUCCESS, FAILED, REFUNDED) and gateway transaction ids. Verify every callback/IPN server-side; make callbacks idempotent.
- Paid orders still follow the Lead -> admin confirm -> Purchase tracking rule.
- Admin: payment status on orders, manual refund action.
Ask me for each gateway's docs and sandbox credentials before writing provider code.
```

## Step 15 — Fraud check

```
Build a fraud check service:
- On order creation, a BullMQ job looks up the phone's delivery history (our own past orders + courier history APIs where available) and stores a FraudCheck row: total orders, delivered, returned, cancelled, success rate, risk level (LOW/MEDIUM/HIGH) with configurable thresholds.
- Show the score and history on the order card and detail page.
- Settings: auto-flag HIGH risk, require advance delivery fee for HIGH risk, phone blocklist.
- Admin can re-run the check manually.
```

## Step 16 — Remaining upsells

```
Add the Phase 2 upsell placements from the blueprint:
- "Frequently bought together" bundles on product pages (Bundle + BundleItem, bundle price, one-tap add all).
- Checkout order bump: one checkbox add-on, highest-priority matching UpsellRule with placement ORDER_BUMP.
- Post-purchase add-on on the thank-you page: one-click add to the same order while status is PENDING; recalculates totals and logs it (Purchase value later uses the confirmed total).
- Admin upsell report: views, take rate and added revenue per placement.
```

## Step 17 — SMS notifications

```
Create an SmsProvider interface and implement my SMS gateway (I'll paste its API docs). Send via BullMQ:
- Order placed (order number + total), confirmed, shipped (tracking link), delivered (thank you + review link).
- Templates editable in admin with {{name}}, {{orderNumber}}, {{total}}, {{trackingUrl}}, Bangla and English versions.
- Log every SMS with status; retry failures twice.
```

## Step 18 — Customer accounts and order tracking

```
Add customer login by phone OTP (sent through SmsProvider, 5-minute expiry, rate-limited):
- /account: my orders, order detail, saved addresses.
- Public /track page: order number + phone shows live status and courier tracking.
- Checkout pre-fills saved address for logged-in customers. Guest checkout stays the default.
```

## Step 19 — Phase 2 QA

```
Phase 2 review: tests for payment callbacks (success, failure, duplicate), fraud scoring thresholds, order bump and post-purchase totals, Purchase sent once with the confirmed total. Playwright: bKash sandbox payment flow at 360px. Re-run Lighthouse on checkout. Report a pass/fail checklist.
```

---

# PHASE 3 — MIGRATION AND LAUNCH

## Step 20 — WooCommerce import script

```
Write scripts/import-woocommerce.ts using the WooCommerce REST API (read-only key from env):
- Pull products, variations, categories, customers, orders and coupons into JSON snapshots first, then import from the snapshots (re-runnable).
- Keep slugs and SKUs unchanged. Prices to Int taka, attributes to variant attributes, Yoast/Rank Math SEO fields if present.
- Download product images, upload to R2, rewrite URLs.
- Customers deduplicated by normalized phone. Orders imported as read-only history with original numbers and statuses (never send tracking events for imported orders).
- Idempotent (upsert by a wooId column), --dry-run flag, summary report of counts and errors.
```

## Step 21 — Redirects

```
Build the redirect layer:
- Script that fetches the old WordPress sitemap(s), maps every URL to its new URL, fills the Redirect table (301).
- Next.js middleware checks Redirect for unknown paths (cached in memory, refreshed every 5 minutes).
- Admin page to add/edit redirects and see 404 hits.
- Script that requests every old URL against staging and reports anything not returning 200 or 301.
```

## Step 22 — Deployment

```
Prepare production deployment on an Ubuntu VPS:
- Production Dockerfiles for web, api, worker (multi-stage, small images). docker-compose.prod.yml with postgres, redis, meilisearch, Caddy (automatic HTTPS) as reverse proxy, behind Cloudflare.
- Nightly pg_dump backup to Cloudflare R2 with 14-day retention, plus a restore script I can test.
- GitHub Actions: on push to main, run tests, build images, deploy over SSH with zero downtime and automatic rollback if /health fails.
- Sentry for web and api, uptime check on /health.
Write DEPLOY.md with every manual step for the server and Cloudflare.
```

## Step 23 — Staging rehearsal

```
Create LAUNCH.md and walk me through a staging rehearsal on new.primegearbd.com (noindex):
- Full import, redirect check, 5 real test orders across COD/bKash, Lead visible and deduplicated in Meta Test Events and TikTok test events, confirm each in admin and check Purchase arrives server-side once, courier test booking, SMS received, GA4 realtime.
- Delta import command for orders placed on WooCommerce since the last import.
- Rollback steps (point DNS back to Hostinger).
```

## Step 24 — Launch day

```
It is launch night. Using LAUNCH.md, guide me step by step: put WooCommerce checkout in maintenance, run the delta import, final redirect check, remove noindex, switch DNS in Cloudflare, switch GTM tags to the Lead/Purchase setup, submit sitemap in Search Console, update the Meta catalog feed URL, place and confirm one live order. Stop after each step and wait for my confirmation.
```

---

# PHASE 4 — GROWTH AND SAAS

## Step 25 — Bangla / English

```
Add bn and en locales with next-intl: UI strings in message files, product name/description/specs in both languages (translation fields in admin), language toggle in header, hreflang tags, locale-aware URLs that keep the existing English URLs unchanged.
```

## Step 26 — Reviews and post-delivery offers

```
Add product reviews: only customers with a DELIVERED order can review (link sent by SMS), photo upload, admin moderation, rating on cards and in Product JSON-LD (aggregateRating).
Add post-delivery offers: a BullMQ job 7–14 days after delivery sends an SMS/Messenger offer for a related product, using UpsellRule with placement POST_DELIVERY.
```

## Step 27 — Wholesale portal

```
Build a wholesale area for shops and resellers: application form, admin approval, wholesale price lists per variant with minimum quantities, separate checkout with advance payment, PDF invoices. Same codebase, role WHOLESALE_CUSTOMER.
```

## Step 28 — Call center and Messenger link

```
Add a call center module: agent queue of pending and incomplete orders, call outcome logging, callback scheduling, per-agent stats. Then expose an API for my Messenger AI bot to look up products, create orders and check order status, secured with an API key.
```

## Step 29 — Multi-tenant SaaS foundation

```
Plan (plan mode only, no code yet) how to turn this into a multi-tenant SaaS: tenant resolution by domain, storeId enforcement on every query (Prisma extension), per-store settings, courier/payment/tracking credentials per store, billing, onboarding. List the risks and the migration order, then wait for my approval.
```
