import Link from "next/link";
import { Logo } from "@primegear/ui";
import { categoryPath } from "@/lib/site";

// TODO: Track order / Return policy / About us / Contact (as in the mockup) once those pages exist
const links = [
  { href: categoryPath("smart-home"), label: "Smart Home" },
  { href: categoryPath("led-lighting"), label: "LED Lighting" },
  { href: categoryPath("gadgets"), label: "Gadgets" },
  { href: categoryPath("accessories"), label: "Accessories" },
];

/** Dark footer. pb-24 on phones keeps the last row clear of the 72 px bottom navigation. */
export function SiteFooter() {
  return (
    <footer className="bg-ink-950 text-mist">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 pb-24 pt-6 md:flex-row md:items-start md:justify-between md:gap-8 md:px-6 md:py-10">
        <div className="flex flex-col gap-3">
          <Logo mark={false} tone="dark" className="self-start" />
          <p className="text-xs font-semibold tracking-tagline text-glow-soft">GEAR UP · LEVEL UP</p>
        </div>
        <nav aria-label="Shop">
          <ul className="flex flex-wrap gap-x-4.5 text-sm">
            {links.map((l) => (
              // 44 px rows for the tap target; the mockup's 4 px row gap is the leading inside them
              <li key={l.href}>
                <Link href={l.href} className="flex min-h-11 items-center text-mist">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="hidden text-sm md:block md:self-end">
          © {new Date().getFullYear()} Prime Gear BD
        </p>
      </div>
    </footer>
  );
}
