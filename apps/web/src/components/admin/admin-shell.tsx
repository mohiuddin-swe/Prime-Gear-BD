"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Boxes, ClipboardList, ExternalLink, LogOut, Package, Tags, User } from "lucide-react";
import { CATALOG_ADMIN_ROLES, type AdminProfile } from "@primegear/shared";
import { BottomNav } from "@primegear/ui/bottom-nav";
import { cn } from "@primegear/ui/cn";
import { ICON_STROKE } from "@primegear/ui/icon";
import { Logo } from "@primegear/ui/logo";
import { adminApi } from "@/lib/admin-api";

const NAV = [
  { key: "orders", label: "Orders", href: "/admin/orders/", Icon: ClipboardList, catalog: false },
  { key: "products", label: "Products", href: "/admin/products/", Icon: Package, catalog: true },
  { key: "categories", label: "Categories", href: "/admin/categories/", Icon: Boxes, catalog: true },
  { key: "brands", label: "Brands", href: "/admin/brands/", Icon: Tags, catalog: true },
] as const;

const ROLE_LABEL: Record<AdminProfile["role"], string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  CALL_AGENT: "Call agent",
  PACKER: "Packer",
};

/**
 * Admin frame. Phones: white top bar + bottom tabs (Orders, then the catalog for owners and
 * managers, then Account). From md: dark ink-950 sidebar with the logo, navigation and the
 * signed-in admin. Call agents and packers only see Orders.
 */
export function AdminShell({ admin, children }: { admin: AdminProfile; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const canCatalog = (CATALOG_ADMIN_ROLES as readonly string[]).includes(admin.role);
  const nav = NAV.filter((n) => canCatalog || !n.catalog);
  const active = nav.find((n) => pathname.startsWith(n.href.slice(0, -1)))?.key;

  const signOut = async () => {
    setSigningOut(true);
    await adminApi.logout().catch(() => undefined);
    router.replace("/admin/login/");
    router.refresh();
  };

  return (
    <div className="min-h-dvh bg-surface md:pl-60">
      {/* md+: sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-ink-950 bg-glow-blue-soft text-mist md:flex">
        <Link href="/admin/orders/" aria-label="Prime Gear BD admin" className="flex flex-col gap-1.5 px-5 pb-6 pt-6">
          <Logo tone="dark" size="desktop" className="self-start" />
          <span className="text-2xs font-semibold uppercase tracking-tagline text-glow-soft">Admin</span>
        </Link>
        <nav aria-label="Admin" className="flex-1 px-3">
          <ul className="flex flex-col gap-1">
            {nav.map(({ key, label, href, Icon }) => (
              <li key={key}>
                <Link
                  href={href}
                  aria-current={active === key ? "page" : undefined}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-btn px-3 text-copy font-semibold transition focus-visible:outline-2 focus-visible:outline-glow",
                    active === key ? "bg-brand-gradient text-white shadow-cta" : "text-mist active:bg-white/10",
                  )}
                >
                  <Icon size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-col gap-1 border-t border-white/10 px-3 py-4">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex h-11 items-center gap-3 rounded-btn px-3 text-sm font-semibold text-mist active:bg-white/10"
          >
            <ExternalLink size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
            View store
          </a>
          <div className="flex items-center gap-3 px-3 py-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">
              {admin.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-white">{admin.name}</span>
              <span className="text-xs text-mist-muted">{ROLE_LABEL[admin.role]}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="flex h-11 items-center gap-3 rounded-btn px-3 text-sm font-semibold text-mist active:bg-white/10 disabled:opacity-50"
          >
            <LogOut size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Phones: top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between bg-white px-4 shadow-hairline md:hidden">
        <Link href="/admin/orders/" aria-label="Prime Gear BD admin" className="flex items-center gap-2">
          <Logo size="mobile" />
        </Link>
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-2xs font-semibold uppercase tracking-tag text-brand-800">
          Admin
        </span>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-5 px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-5 md:gap-6 md:px-6 md:pb-10 md:pt-8 xl:px-10">
        {children}
      </main>

      <BottomNav
        LinkComponent={Link}
        items={[
          ...nav.map(({ key, label, href, Icon }) => ({
            key,
            label,
            href,
            active: active === key,
            icon: <Icon size={22} strokeWidth={ICON_STROKE} aria-hidden="true" />,
          })),
          {
            key: "account",
            label: "Account",
            href: "/admin/account/",
            active: pathname.startsWith("/admin/account"),
            icon: <User size={22} strokeWidth={ICON_STROKE} aria-hidden="true" />,
          },
        ]}
      />
    </div>
  );
}
