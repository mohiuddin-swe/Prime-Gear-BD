import Link from "next/link";
import { Logo } from "@primegear/ui";

const links = [
  { href: "/product-category/smart-home/", label: "Smart Home" },
  { href: "/product-category/led-lighting/", label: "LED Lighting" },
  { href: "/product-category/gadgets/", label: "Gadgets" },
  { href: "/product-category/accessories/", label: "Accessories" },
];

export function SiteFooter() {
  return (
    <footer className="bg-ink-950 pb-24 text-slate-300 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.5fr_1fr] md:px-6 md:py-14">
        <div className="space-y-3">
          <Logo size="desktop" tone="dark" />
          <p className="font-heading text-base font-bold tracking-widest text-glow">
            GEAR UP · LEVEL UP
          </p>
          <p className="max-w-sm text-base">
            Smart home, LED lighting, electronics and gadgets, delivered across Bangladesh.
          </p>
        </div>
        <nav aria-label="Shop">
          <h2 className="mb-2 font-heading text-base font-bold text-white">Shop</h2>
          <ul>
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="flex min-h-11 items-center text-base">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-4 text-sm md:px-6">
          © {new Date().getFullYear()} Prime Gear BD. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
