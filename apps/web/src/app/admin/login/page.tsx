import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@primegear/ui/logo";
import { LoginForm } from "@/components/admin/login-form";
import { getAdminSession } from "@/lib/admin-server";

export const metadata: Metadata = { title: "Sign in" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const { denied } = await searchParams;
  const admin = await getAdminSession();
  if (admin && !denied) redirect("/admin/orders/");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-ink-950 bg-glow-blue px-4 py-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-2">
          <Logo tone="dark" size="desktop" />
          <p className="text-xs font-semibold tracking-tagline text-glow-soft">GEAR UP · LEVEL UP</p>
        </div>
        <div className="flex flex-col gap-5 rounded-panel bg-white p-5 shadow-card-lift md:p-6">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-title font-extrabold tracking-heading text-ink-950">
              Admin sign in
            </h1>
            <p className="text-sm text-ink-500">Manage orders, products and customers.</p>
          </div>
          {denied && (
            <p role="alert" className="rounded-btn bg-brand-50 px-3.5 py-3 text-sm text-brand-800">
              Your role can&apos;t open that page. Sign in with another account.
            </p>
          )}
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
