import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { buttonClasses } from "@primegear/ui/button";
import { ICON_STROKE } from "@primegear/ui/icon";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { Panel, PageTitle } from "@/components/admin/ui";
import { getAdminSession } from "@/lib/admin-server";

export const metadata: Metadata = { title: "Account" };

/** Phones reach the store link and sign-out here (the md+ sidebar has both built in). */
export default async function AdminAccountPage() {
  const admin = await getAdminSession();
  return (
    <>
      <PageTitle title="Account" />
      <Panel>
        <dl className="grid gap-3 text-base">
          <div>
            <dt className="text-sm text-ink-500">Name</dt>
            <dd className="font-semibold">{admin?.name}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-500">Email</dt>
            <dd className="font-semibold">{admin?.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-500">Role</dt>
            <dd className="font-semibold">{admin?.role}</dd>
          </div>
        </dl>
        <a href="/" target="_blank" rel="noreferrer" className={buttonClasses({ variant: "outline" }, "w-full md:w-auto")}>
          <ExternalLink size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
          View store
        </a>
        <SignOutButton />
      </Panel>
    </>
  );
}
