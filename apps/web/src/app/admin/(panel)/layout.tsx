import { redirect } from "next/navigation";
import { CATALOG_ADMIN_ROLES } from "@primegear/shared";
import { AdminShell } from "@/components/admin/admin-shell";
import { ADMIN_LOGIN_PATH, getAdminSession } from "@/lib/admin-server";

/** Protected admin pages: no session → login. The API checks the session and role on every call too. */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminSession();
  if (!admin) redirect(ADMIN_LOGIN_PATH);
  if (!(CATALOG_ADMIN_ROLES as readonly string[]).includes(admin.role)) {
    // Call agents and packers get the order screens (Step 10); the catalog is owner/manager only
    redirect(`${ADMIN_LOGIN_PATH}?denied=1`);
  }
  return <AdminShell admin={admin}>{children}</AdminShell>;
}
