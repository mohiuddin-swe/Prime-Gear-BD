import type { Metadata } from "next";
import { Lightbulb, Plug, Search, ShoppingCart, Zap } from "lucide-react";
import {
  Button,
  ButtonLink,
  DiscountBadge,
  ICON_STROKE,
  Logo,
  Price,
  ProductCard,
  ProductCardSkeleton,
  QuickAddButton,
  SectionDark,
  Skeleton,
  TrustStrip,
  cn,
} from "@primegear/ui";
import { colors } from "@primegear/ui/tailwind-preset";
import { OverlayDemo } from "./overlay-demo";

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
  { name: "brand-50", hex: colors.brand[50], bg: "bg-brand-50", note: "Selected, info" },
  { name: "ink-950", hex: colors.ink[950], bg: "bg-ink-950", note: "Dark sections, footer" },
  { name: "ink-900", hex: colors.ink[900], bg: "bg-ink-900", note: "Body text on light" },
  { name: "surface", hex: colors.surface, bg: "bg-surface", note: "Page, image backdrop" },
  { name: "glow", hex: colors.glow, bg: "bg-glow", note: "Highlights on dark only" },
  { name: "deal", hex: colors.deal, bg: "bg-deal", note: "Deals and timers only" },
  { name: "success", hex: colors.success, bg: "bg-success", note: "Icons, indicators" },
  { name: "danger", hex: colors.danger, bg: "bg-danger", note: "Errors" },
];

// Real combinations used in the UI, with the AA threshold that applies to each
const pairs = [
  { label: "Body text: ink-900 on white", fg: colors.ink[900], bg: "#ffffff", min: 4.5 },
  { label: "Body text: ink-900 on surface", fg: colors.ink[900], bg: colors.surface, min: 4.5 },
  { label: "Button: white on brand-600", fg: "#ffffff", bg: colors.brand[600], min: 4.5 },
  { label: "Button: white on brand-800", fg: "#ffffff", bg: colors.brand[800], min: 4.5 },
  { label: "Link: brand-600 on white", fg: colors.brand[600], bg: "#ffffff", min: 4.5 },
  { label: "Link: brand-600 on brand-50", fg: colors.brand[600], bg: colors.brand[50], min: 4.5 },
  { label: "Deal badge: ink-950 on deal", fg: colors.ink[950], bg: colors.deal, min: 4.5 },
  { label: "Dark: white on ink-950", fg: "#ffffff", bg: colors.ink[950], min: 4.5 },
  { label: "Dark: glow on ink-950", fg: colors.glow, bg: colors.ink[950], min: 4.5 },
  { label: "Error: danger on white", fg: colors.danger, bg: "#ffffff", min: 4.5 },
  { label: "Not for text: white on deal", fg: "#ffffff", bg: colors.deal, min: 0 },
  { label: "Not for text: white on success", fg: "#ffffff", bg: colors.success, min: 0 },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-heading text-xl font-bold md:text-2xl">{title}</h2>
      {children}
    </section>
  );
}

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
            <p className="font-heading text-3xl font-extrabold">Heading, Plus Jakarta Sans 800</p>
            <p className="font-heading text-xl font-bold">Subheading, Plus Jakarta Sans 700</p>
            <p className="text-base">Body text is Inter 16 px. Smart plugs, LED strips and more.</p>
            <p className="font-bangla text-base">
              বাংলা লেখা Hind Siliguri: স্মার্ট হোম ও এলইডি লাইটিং
            </p>
            <p className="text-base font-bold tabular-nums">৳1,190 · ৳12,490 · ৳1,00,000</p>
          </div>
        </Section>

        <Section title="Radii and shadow">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex h-24 items-center justify-center rounded-card bg-white text-base shadow-card">
              card 16 px
            </div>
            <div className="flex h-24 items-center justify-center rounded-btn bg-white text-base shadow-card">
              button 12 px
            </div>
          </div>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
            <Button>Order now</Button>
            <Button variant="outline">Add to cart</Button>
            <Button variant="ghost">View details</Button>
            <Button disabled>Disabled</Button>
            <ButtonLink href="#" variant="outline">
              <ShoppingCart size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
              Link as button
            </ButtonLink>
          </div>
          <p className="text-sm">48 px tall on mobile, 44 px from md up. Press lifts 1 px.</p>
        </Section>

        <Section title="Price and discount badge">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-card bg-white p-4 shadow-card">
            <Price amount={1190} />
            <Price amount={1190} compareAt={1490} />
            <Price amount={12490} compareAt={14990} size="lg" />
            <DiscountBadge price={1190} compareAt={1490} />
            <DiscountBadge percent={35} />
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
          <TrustStrip
            items={[
              { icon: "cod", title: "Cash on delivery", caption: "Pay when you receive" },
              { icon: "delivery", title: "Fast delivery", caption: "All over Bangladesh" },
              { icon: "warranty", title: "Warranty", caption: "Genuine products" },
              { icon: "whatsapp", title: "WhatsApp", caption: "Chat with us" },
            ]}
          />
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

        <Section title="Icons (Lucide, stroke 1.75)">
          <div className="flex items-center gap-6 rounded-card bg-white p-4 shadow-card">
            {[Search, ShoppingCart, Zap, Plug, Lightbulb].map((Icon, i) => (
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
              <ButtonLink href="#" variant="outline">
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
