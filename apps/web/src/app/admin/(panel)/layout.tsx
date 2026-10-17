import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { ADMIN_LOGIN_PATH, getAdminSession } from "@/lib/admin-server";

/** Protected admin pages: no session → login. Sections gate roles themselves (see (catalog)/layout). */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminSession();
  if (!admin) redirect(ADMIN_LOGIN_PATH);
  return <AdminShell admin={admin}>{children}</AdminShell>;
}
