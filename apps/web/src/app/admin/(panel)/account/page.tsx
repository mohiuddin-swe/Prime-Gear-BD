import type { Metadata } from "next";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { Panel, PageTitle } from "@/components/admin/ui";
import { getAdminSession } from "@/lib/admin-server";

export const metadata: Metadata = { title: "Account" };

/** Phones reach sign-out here (the md+ sidebar has it built in). */
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
        <SignOutButton />
      </Panel>
    </>
  );
}
