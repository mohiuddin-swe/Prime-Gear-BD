import type { Metadata } from "next";
import {
  Activity,
  Lightbulb,
  Plug,
  Search,
  ShoppingBag,
  Wifi,
  Zap,
} from "lucide-react";
import {
  Accordion,
  BottomNav,
  Button,
  ButtonLink,
  DiscountBadge,
  Eyebrow,
  GlowChip,
  GlowTile,
  Header,
  ICON_STROKE,
  IconButton,
  Logo,
  PageHeader,
  PriceBlock,
  ProductCard,
  ProductCardSkeleton,
  QuickAddButton,
  SaveBadge,
  SectionDark,
  Skeleton,
  StickyActionBar,
  TrustStrip,
  WhatsAppOrderLink,
  cn,
  defaultBottomNavItems,
} from "@primegear/ui";
import { colors } from "@primegear/ui/tailwind-preset";
import { OverlayDemo } from "./overlay-demo";
import { SelectableDemo } from "./selectable-demo";

export const metadata: Metadata = {
  title: "Styleguide · Prime Gear BD",
  robots: { index: false, follow: false },
};

// WCAG 2.x contrast ratio
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const swatches = [
  { name: "brand-600", hex: colors.brand[600], bg: "bg-brand-600", note: "Actions, links" },
  { name: "brand-800", hex: colors.brand[800], bg: "bg-brand-800", note: "Gradient end, hover" },
  { name: "brand-400", hex: colors.brand[400], bg: "bg-brand-400", note: "BD in wordmark on dark" },
  { name: "brand-100", hex: colors.brand[100], bg: "bg-brand-100", note: "Progress track" },
  { name: "brand-50", hex: colors.brand[50], bg: "bg-brand-50", note: "Selected, info" },
  { name: "ink-950", hex: colors.ink[950], bg: "bg-ink-950", note: "Dark sections, footer" },
  { name: "ink-900", hex: colors.ink[900], bg: "bg-ink-900", note: "Body text on light" },
  { name: "ink-700", hex: colors.ink[700], bg: "bg-ink-700", note: "Secondary text" },
  { name: "ink-500", hex: colors.ink[500], bg: "bg-ink-500", note: "Muted text, inactive nav" },
  { name: "ink-400", hex: colors.ink[400], bg: "bg-ink-400", note: "Compare price" },
  { name: "surface", hex: colors.surface.DEFAULT, bg: "bg-surface", note: "Page background" },
  { name: "surface-sunken", hex: colors.surface.sunken, bg: "bg-surface-sunken", note: "Image backdrop, search" },
  { name: "line", hex: colors.line.DEFAULT, bg: "bg-line", note: "Header, nav, bar hairlines" },
  { name: "line-strong", hex: colors.line.strong, bg: "bg-line-strong", note: "Input, stepper borders" },
  { name: "line-stronger", hex: colors.line.stronger, bg: "bg-line-stronger", note: "Unselected radio ring" },
  { name: "mist", hex: colors.mist.DEFAULT, bg: "bg-mist", note: "Body text on dark" },
  { name: "mist-dim", hex: colors.mist.dim, bg: "bg-mist-dim", note: "Struck price on dark" },
  { name: "glow", hex: colors.glow.DEFAULT, bg: "bg-glow", note: "Highlights on dark only" },
  { name: "glow-soft", hex: colors.glow.soft, bg: "bg-glow-soft", note: "Eyebrow on dark" },
  { name: "warm", hex: colors.warm, bg: "bg-warm", note: "Lamp light in art" },
  { name: "deal", hex: colors.deal.DEFAULT, bg: "bg-deal", note: "Deals and timers only" },
  { name: "deal-soft", hex: colors.deal.soft, bg: "bg-deal-soft", note: "Save badge" },
  { name: "deal-cream", hex: colors.deal.cream, bg: "bg-deal-cream", note: "Order bump" },
  { name: "deal-ink", hex: colors.deal.ink, bg: "bg-deal-ink", note: "Text on deal-soft" },
  { name: "success", hex: colors.success.DEFAULT, bg: "bg-success", note: "Indicators, WhatsApp" },
  { name: "success-ink", hex: colors.success.ink, bg: "bg-success-ink", note: "Green text" },
  { name: "danger", hex: colors.danger, bg: "bg-danger", note: "Errors" },
  { name: "pay-bkash", hex: colors.pay.bkash, bg: "bg-pay-bkash", note: "bKash chip" },
  { name: "pay-nagad", hex: colors.pay.nagad, bg: "bg-pay-nagad", note: "Nagad chip" },
  { name: "pay-rocket", hex: colors.pay.rocket, bg: "bg-pay-rocket", note: "Rocket chip" },
];

// Real combinations used in the UI, with the AA threshold that applies to each
const pairs = [
  { label: "Body text: ink-900 on white", fg: colors.ink[900], bg: "#ffffff", min: 4.5 },
  { label: "Body text: ink-900 on surface", fg: colors.ink[900], bg: colors.surface.DEFAULT, min: 4.5 },
  { label: "Button: white on brand-600", fg: "#ffffff", bg: colors.brand[600], min: 4.5 },
  { label: "Button: white on brand-800", fg: "#ffffff", bg: colors.brand[800], min: 4.5 },
  { label: "Link: brand-600 on white", fg: colors.brand[600], bg: "#ffffff", min: 4.5 },
  { label: "Link: brand-600 on brand-50", fg: colors.brand[600], bg: colors.brand[50], min: 4.5 },
  { label: "Deal badge: ink-950 on deal", fg: colors.ink[950], bg: colors.deal.DEFAULT, min: 4.5 },
  { label: "Dark: white on ink-950", fg: "#ffffff", bg: colors.ink[950], min: 4.5 },
  { label: "Dark: glow on ink-950", fg: colors.glow.DEFAULT, bg: colors.ink[950], min: 4.5 },
  { label: "Error: danger on white", fg: colors.danger, bg: "#ffffff", min: 4.5 },
  { label: "Muted: ink-500 on white", fg: colors.ink[500], bg: "#ffffff", min: 4.5 },
  { label: "Muted: ink-500 on surface-sunken", fg: colors.ink[500], bg: colors.surface.sunken, min: 4.5 },
  { label: "Compare price: ink-400 on white", fg: colors.ink[400], bg: "#ffffff", min: 4.5 },
  { label: "Selected: brand-800 on brand-50", fg: colors.brand[800], bg: colors.brand[50], min: 4.5 },
  { label: "Save badge: deal-ink on deal-soft", fg: colors.deal.ink, bg: colors.deal.soft, min: 4.5 },
  { label: "Order bump: deal-ink on deal-cream", fg: colors.deal.ink, bg: colors.deal.cream, min: 4.5 },
  { label: "Green text: success-ink on white", fg: colors.success.ink, bg: "#ffffff", min: 4.5 },
  { label: "Dark body: mist on ink-950", fg: colors.mist.DEFAULT, bg: colors.ink[950], min: 4.5 },
  { label: "Dark compare: mist-dim on ink-950", fg: colors.mist.dim, bg: colors.ink[950], min: 4.5 },
  { label: "Dark eyebrow: glow-soft on ink-950", fg: colors.glow.soft, bg: colors.ink[950], min: 4.5 },
  { label: "Chip: white on pay-bkash", fg: "#ffffff", bg: colors.pay.bkash, min: 4.5 },
  { label: "Chip: white on pay-nagad", fg: "#ffffff", bg: colors.pay.nagad, min: 4.5 },
  { label: "Chip: white on pay-rocket", fg: "#ffffff", bg: colors.pay.rocket, min: 4.5 },
  { label: "Not for text: white on deal", fg: "#ffffff", bg: colors.deal.DEFAULT, min: 0 },
  { label: "Not for text: white on success (green fill only)", fg: "#ffffff", bg: colors.success.DEFAULT, min: 0 },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-heading text-xl font-bold md:text-2xl">{title}</h2>
      {children}
    </section>
  );
}

/** 390 px frame (the mockup width) so mobile-only components can be checked on any screen */
function Phone({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative w-full max-w-[390px] overflow-hidden rounded-panel border border-line bg-surface",
        className,
      )}
    >
      {children}
    </div>
  );
}

const typeScale = [
  { cls: "text-4xl", px: 36, use: "Rating score" },
  { cls: "text-3xl", px: 30, use: "Hero heading, product price" },
  { cls: "text-2xl", px: 24, use: "Dark section heading, hero price" },
  { cls: "text-title", px: 22, use: "Page title, checkout total" },
  { cls: "text-xl", px: 20, use: "Section heading, bar total" },
  { cls: "text-lg", px: 18, use: "Card price, sub-heading" },
  { cls: "text-lead", px: 17, use: "Bar CTA, flash price" },
  { cls: "text-base", px: 16, use: "Body, inputs, buttons" },
  { cls: "text-copy", px: 15, use: "Card name, option title" },
  { cls: "text-sm", px: 14, use: "Secondary text, links" },
  { cls: "text-caption", px: 13, use: "Compare price, helper text, trust labels" },
  { cls: "text-xs", px: 12, use: "Nav labels, badges, eyebrow" },
  { cls: "text-2xs", px: 11, use: "Tier tag pill" },
];

const radii = [
  { cls: "rounded-sheet", name: "sheet 24", note: "Bottom sheet top corners" },
  { cls: "rounded-panel", name: "panel 20", note: "Hero, dark sections, white panels" },
  { cls: "rounded-card", name: "card 16", note: "Product cards, cart lines" },
  { cls: "rounded-tile", name: "tile 14", note: "Selectable cards, icon tiles" },
  { cls: "rounded-btn", name: "btn 12", note: "Buttons, inputs" },
  { cls: "rounded-control", name: "control 10", note: "Stepper, small buttons" },
  { cls: "rounded-lg", name: "badge 8", note: "Discount badge" },
];

const shadows = [
  { cls: "shadow-card", note: "Cards (default)" },
  { cls: "shadow-card-soft", note: "Info cards, category tiles" },
  { cls: "shadow-selected", note: "Selected bulk tier" },
  { cls: "shadow-cta", note: "Primary buttons" },
  { cls: "shadow-bar", note: "Sticky action bar" },
  { cls: "shadow-sheet", note: "Bottom sheet / cart" },
];

const imageBackdrop = (Icon: typeof Lightbulb) => (
  <span className="flex h-full w-full items-center justify-center text-brand-600">
    <Icon size={48} strokeWidth={ICON_STROKE} aria-hidden="true" />
  </span>
);

export default function StyleguidePage() {
  return (
    <>
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 md:space-y-14 md:px-6 md:py-12">
        <header className="space-y-2">
          <h1 className="font-heading text-3xl font-extrabold md:text-4xl">Styleguide</h1>
          <p className="text-base">
            Prime Gear BD tokens and components. Designed at 360 px first.
          </p>
        </header>

        <Section title="Logo">
          <div className="flex flex-wrap items-center gap-6">
            <div className="rounded-card bg-white p-4 shadow-card">
              <Logo size="mobile" />
            </div>
            <div className="rounded-card bg-white p-4 shadow-card">
              <Logo size="desktop" />
            </div>
            <div className="rounded-card bg-ink-950 p-4">
              <Logo size="desktop" tone="dark" />
            </div>
          </div>
        </Section>

        <Section title="Colors">
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {swatches.map((s) => (
              <li key={s.name} className="overflow-hidden rounded-card bg-white shadow-card">
                <div className={cn("h-16 border-b border-ink-900/10", s.bg)} />
                <div className="p-3">
                  <p className="text-base font-semibold">{s.name}</p>
                  <p className="text-sm tabular-nums">{s.hex}</p>
                  <p className="text-sm text-ink-900/70">{s.note}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="h-16 rounded-card bg-brand-gradient" />
          <p className="text-sm">
            <code>bg-brand-gradient</code>: linear-gradient(135deg, #1a56db, #0d3b8f)
          </p>
        </Section>

        <Section title="Contrast (WCAG AA, computed from the tokens)">
          <ul className="grid gap-2 md:grid-cols-2">
            {pairs.map((p) => {
              const ratio = contrast(p.fg, p.bg);
              const pass = ratio >= p.min;
              return (
                <li
                  key={p.label}
                  className="flex items-center justify-between gap-3 rounded-btn bg-white p-3 shadow-card"
                >
                  <span className="flex items-center gap-3">
                    <span
                      className="flex size-10 items-center justify-center rounded-btn border border-ink-900/10 font-bold"
                      style={{ color: p.fg, backgroundColor: p.bg }}
                    >
                      Aa
                    </span>
                    <span className="text-base">{p.label}</span>
                  </span>
                  <span className="shrink-0 text-base font-semibold tabular-nums">
                    {ratio.toFixed(1)}:1 {p.min === 0 ? "n/a" : pass ? "AA ✓" : "FAIL"}
                  </span>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section title="Typography">
          <div className="space-y-3 rounded-card bg-white p-4 shadow-card">
            <p className="font-heading text-3xl font-extrabold tracking-display">
              Heading, Plus Jakarta Sans 800
            </p>
            <p className="font-heading text-xl font-bold tracking-heading">
              Subheading, Plus Jakarta Sans 700
            </p>
            <p className="text-base">Body text is Inter 16 px. Smart plugs, LED strips and more.</p>
            <p className="font-bangla text-base">
              বাংলা লেখা Hind Siliguri: স্মার্ট হোম ও এলইডি লাইটিং
            </p>
            <p className="font-heading text-lg font-extrabold tabular-nums">
              ৳1,190 · ৳12,490 · ৳1,00,000
            </p>
          </div>
          <ul className="divide-y divide-surface-sunken rounded-card bg-white shadow-card">
            {typeScale.map((t) => (
              <li key={t.cls} className="flex items-baseline gap-3 px-4 py-2.5">
                <span className="w-24 shrink-0 text-caption tabular-nums text-ink-500">
                  {t.cls.replace("text-", "")} · {t.px}px
                </span>
                <span className={cn("min-w-0 flex-1 truncate font-heading font-bold", t.cls)}>
                  {t.use}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Radii and shadows">
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {radii.map((r) => (
              <li
                key={r.cls}
                className={cn("flex h-24 flex-col items-center justify-center bg-white p-2 text-center shadow-card", r.cls)}
              >
                <span className="text-base font-semibold">{r.name}</span>
                <span className="text-caption text-ink-500">{r.note}</span>
              </li>
            ))}
          </ul>
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {shadows.map((sh) => (
              <li
                key={sh.cls}
                className={cn("flex h-20 flex-col items-center justify-center rounded-card bg-white text-center", sh.cls)}
              >
                <span className="text-sm font-semibold">{sh.cls}</span>
                <span className="text-caption text-ink-500">{sh.note}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
            <Button>Order now</Button>
            <Button variant="outline">Add to cart</Button>
            <Button variant="ghost">View details</Button>
            <Button disabled>Disabled</Button>
            <Button size="lg">Place order (54 px)</Button>
            <Button size="sm" variant="outline">
              + Add ৳590
            </Button>
            <Button size="icon" variant="outline" aria-label="Add to cart">
              <ShoppingBag size={22} strokeWidth={ICON_STROKE} aria-hidden="true" />
            </Button>
            <ButtonLink href="#" variant="outline">
              <ShoppingBag size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
              Link as button
            </ButtonLink>
            <IconButton label="Open menu">
              <Search size={22} strokeWidth={ICON_STROKE} aria-hidden="true" />
            </IconButton>
          </div>
          <p className="text-sm">
            48 px tall on mobile, 44 px from md up; lg 54 px for the bar CTA; sm 40 px with a 44 px
            hit area. Press lifts 1 px.
          </p>
        </Section>

        <Section title="PriceBlock and discount badge">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col items-start gap-4 rounded-card bg-white p-4 shadow-card">
              <p className="text-sm text-ink-500">inline, light</p>
              <PriceBlock amount={1490} compareAt={1750} size="xl" showSave />
              <PriceBlock amount={12490} compareAt={14990} size="lg" />
              <PriceBlock amount={1190} />
              <PriceBlock amount={890} compareAt={1190} size="sm" />
            </div>
            <div className="space-y-4 rounded-card bg-white p-4 shadow-card">
              <p className="text-sm text-ink-500">stacked (product card)</p>
              <div className="flex gap-8">
                <PriceBlock amount={1190} compareAt={1490} layout="stacked" />
                <PriceBlock amount={890} layout="stacked" />
              </div>
              <p className="text-sm text-ink-500">Save badge and discount badges</p>
              <div className="flex flex-wrap items-center gap-3">
                <SaveBadge amount={260} />
                <DiscountBadge percent={15} size="sm" />
                <DiscountBadge percent={15} />
                <DiscountBadge percent={15} size="lg" />
              </div>
            </div>
            <div className="rounded-card bg-ink-950 p-4 md:col-span-2">
              <PriceBlock amount={1490} compareAt={1750} size="lg" tone="dark" />
            </div>
          </div>
        </Section>

        <Section title="Product cards">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
            <ProductCard
              name="Smart Wi-Fi Plug 16A with energy monitor"
              href="#"
              image={imageBackdrop(Plug)}
              price={1190}
              compareAt={1490}
              rating={{ value: 4.8, count: 126 }}
              quickAdd={<QuickAddButton />}
            />
            <ProductCard
              name="RGB LED Strip 5m"
              href="#"
              image={imageBackdrop(Lightbulb)}
              price={890}
              rating={{ value: 4.5, count: 54 }}
              quickAdd={<QuickAddButton />}
            />
            <ProductCard
              name="Smart Bulb 9W Warm and Cool"
              href="#"
              image={imageBackdrop(Zap)}
              price={650}
              compareAt={800}
              outOfStock
            />
            <ProductCardSkeleton />
          </div>
        </Section>

        <Section title="Trust strip">
          <div className="max-w-[390px]">
            <TrustStrip
              items={[
                { icon: "cod", title: "Cash on delivery" },
                { icon: "delivery", title: "7-day replacement" },
                { icon: "whatsapp", title: "WhatsApp support" },
              ]}
            />
          </div>
          <p className="text-sm">layout=&quot;tiles&quot; (icon beside text, used where space allows):</p>
          <TrustStrip
            layout="tiles"
            items={[
              { icon: "cod", title: "Cash on delivery", caption: "Pay when you receive" },
              { icon: "delivery", title: "Fast delivery", caption: "All over Bangladesh" },
              { icon: "warranty", title: "Warranty", caption: "Genuine products" },
              { icon: "whatsapp", title: "WhatsApp", caption: "Chat with us" },
            ]}
          />
        </Section>

        <Section title="Header">
          <Phone>
            <Header
              menuHref="#"
              whatsappHref="#"
              cartCount={2}
              cartHref="#"
              className="shadow-none"
            />
          </Phone>
          <p className="text-sm">
            Menu, logo, WhatsApp, cart with count bubble, then a 48 px search field. Inner pages use
            PageHeader:
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <Phone>
              <PageHeader
                backHref="#"
                title="LED Lighting"
                actions={
                  <>
                    <IconButton label="Search">
                      <Search size={22} strokeWidth={ICON_STROKE} aria-hidden="true" />
                    </IconButton>
                    <IconButton label="Cart, 2 items" href="#">
                      <ShoppingBag size={22} strokeWidth={ICON_STROKE} aria-hidden="true" />
                    </IconButton>
                  </>
                }
              />
            </Phone>
            <Phone>
              <PageHeader backHref="#" titleAs="p" title="LED & Smart Lights" />
            </Phone>
            <Phone>
              <PageHeader backHref="#" backLabel="Back to cart" title="Checkout" hairline />
            </Phone>
          </div>
        </Section>

        <Section title="Bottom navigation">
          <Phone className="h-[72px]">
            <BottomNav
              className="absolute md:flex"
              items={defaultBottomNavItems({ active: "home", cartCount: 2 })}
            />
          </Phone>
          <p className="text-sm">
            Active item is brand-600 and semibold; the bar is mobile only and is shown here in a frame.
          </p>
        </Section>

        <Section title="Selectable cards, stepper">
          <SelectableDemo />
        </Section>

        <Section title="Accordion">
          <div className="max-w-[390px]">
            <Accordion
              items={[
                {
                  id: "specs",
                  title: "Specifications",
                  defaultOpen: true,
                  content: (
                    <dl className="px-4 pb-2">
                      {[
                        ["Battery", "1800mAh rechargeable"],
                        ["Backup", "4–8 hours"],
                        ["Charging", "Type-C, about 2 hours"],
                      ].map(([k, v]) => (
                        <div key={k} className="flex gap-3 border-t border-surface-sunken py-3">
                          <dt className="flex-1 text-copy text-ink-500">{k}</dt>
                          <dd className="text-copy font-semibold">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  ),
                },
                {
                  id: "box",
                  title: "What's in the box",
                  defaultOpen: true,
                  content: (
                    <ul className="grid grid-cols-2 gap-x-3 gap-y-2 px-4 pb-3.5 text-sm text-ink-700">
                      {["Wall lamp", "Remote control", "Magnetic base", "Type-C cable"].map((x) => (
                        <li key={x} className="flex gap-1.5">
                          <span className="font-bold text-brand-600">1×</span>
                          {x}
                        </li>
                      ))}
                    </ul>
                  ),
                },
                {
                  id: "delivery",
                  title: "Delivery and replacement",
                  content: (
                    <p className="px-4 pb-4 text-copy text-ink-700">
                      Inside Dhaka 1–2 days, outside Dhaka 2–4 days. 7-day replacement for defects.
                    </p>
                  ),
                },
              ]}
            />
          </div>
        </Section>

        <Section title="Sticky action bar">
          <div className="grid gap-4 md:grid-cols-2">
            <Phone>
              <StickyActionBar
                position="static"
                label="2 pieces"
                total={2742}
                secondary={
                  <Button size="icon" variant="outline" aria-label="Add to cart">
                    <ShoppingBag size={22} strokeWidth={ICON_STROKE} aria-hidden="true" />
                  </Button>
                }
                footer={<WhatsAppOrderLink href="#" />}
              >
                <Button size="lg">Order now</Button>
              </StickyActionBar>
            </Phone>
            <Phone>
              <StickyActionBar position="static" label="Total" total={2742}>
                <Button size="lg">Place order</Button>
              </StickyActionBar>
            </Phone>
          </div>
        </Section>

        <Section title="Skeleton">
          <div className="space-y-2 rounded-card bg-white p-4 shadow-card">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-12 w-full" />
          </div>
        </Section>

        <Section title="Bottom sheet, drawer, quick add">
          <OverlayDemo />
        </Section>

        <Section title="Dark section cards">
          <div className="grid gap-4 md:grid-cols-2">
            <SectionDark card glow="cyan" className="max-w-[390px]">
              <div className="flex flex-col gap-3.5">
                <Eyebrow>Smart home</Eyebrow>
                <h3 className="font-heading text-2xl font-extrabold leading-[1.15] tracking-display">
                  Make every room
                  <br />a little smarter.
                </h3>
                <div className="flex flex-wrap gap-2">
                  <GlowChip icon={<Activity size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />}>
                    Motion sensing
                  </GlowChip>
                  <GlowChip icon={<Wifi size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />}>
                    App control
                  </GlowChip>
                </div>
                <ButtonLink href="#" variant="outline-dark" className="self-start">
                  Explore smart home
                </ButtonLink>
              </div>
            </SectionDark>
            <SectionDark card glow="cyan" className="max-w-[390px]">
              <h3 className="mb-3.5 font-heading text-lg font-bold">Why people love it</h3>
              <div className="grid grid-cols-2 gap-2.5">
                <GlowTile
                  icon={<Zap size={24} strokeWidth={ICON_STROKE} aria-hidden="true" />}
                  title="1800mAh battery"
                >
                  Up to 4–8 hours. Type-C charging.
                </GlowTile>
                <GlowTile
                  icon={<Lightbulb size={24} strokeWidth={ICON_STROKE} aria-hidden="true" />}
                  title="No drilling"
                >
                  Magnetic base on 3M sticker or screws.
                </GlowTile>
              </div>
            </SectionDark>
            <SectionDark card glow="hero" className="max-w-[390px]" contentClassName="flex flex-col items-start gap-3 py-6">
              <Eyebrow className="inline-block rounded-full border border-glow/45 px-2.5 py-1.5 tracking-tag">
                Bestseller · 360° rotation
              </Eyebrow>
              <h3 className="font-heading text-3xl font-extrabold leading-[1.12] tracking-display">
                One lamp. Spotlight and night light.
              </h3>
              <PriceBlock amount={1490} compareAt={1750} size="lg" tone="dark" />
              <ButtonLink href="#" className="shadow-cta-hero">
                Shop now
              </ButtonLink>
            </SectionDark>
            <SectionDark card glow="warm" className="max-w-[390px]" contentClassName="py-4">
              <p className="font-heading text-lg font-bold">LED &amp; Smart Lights</p>
              <p className="text-caption text-mist">Our bestselling category</p>
            </SectionDark>
          </div>
        </Section>

        <Section title="Icons (Lucide, stroke 1.75)">
          <div className="flex items-center gap-6 rounded-card bg-white p-4 shadow-card">
            {[Search, ShoppingBag, Zap, Plug, Lightbulb].map((Icon, i) => (
              <Icon
                key={i}
                size={24}
                strokeWidth={ICON_STROKE}
                className="text-brand-600"
                aria-hidden="true"
              />
            ))}
            <Search
              size={20}
              strokeWidth={ICON_STROKE}
              className="text-brand-600"
              aria-hidden="true"
            />
          </div>
        </Section>
      </div>

      <SectionDark>
        <div className="space-y-8">
          <div className="space-y-2">
            <p className="font-heading text-sm font-bold uppercase tracking-widest text-glow">
              Smart home
            </p>
            <h2 className="font-heading text-3xl font-extrabold md:text-4xl">
              Light up every room
            </h2>
            <p className="max-w-xl text-base text-slate-300">
              Dark showcase section: ink-950 with a soft blue and cyan glow. Glow is used for small
              highlights only, never body text.
            </p>
            <div className="flex flex-col gap-3 pt-2 md:flex-row">
              <ButtonLink href="#">Shop smart lighting</ButtonLink>
              <ButtonLink href="#" variant="outline-dark">
                Learn more
              </ButtonLink>
            </div>
          </div>
          <TrustStrip
            tone="dark"
            items={[
              { icon: "cod", title: "Cash on delivery" },
              { icon: "delivery", title: "Fast delivery" },
              { icon: "warranty", title: "Warranty" },
              { icon: "whatsapp", title: "WhatsApp" },
            ]}
          />
        </div>
      </SectionDark>
    </>
  );
}
