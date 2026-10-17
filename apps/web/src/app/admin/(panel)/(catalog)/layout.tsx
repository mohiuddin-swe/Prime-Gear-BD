import { redirect } from "next/navigation";
import { CATALOG_ADMIN_ROLES } from "@primegear/shared";
import { getAdminSession } from "@/lib/admin-server";

/** Products, categories and brands: owner/manager only (the API enforces this on every call too). */
export default async function CatalogLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminSession();
  if (!admin || !(CATALOG_ADMIN_ROLES as readonly string[]).includes(admin.role)) {
    redirect("/admin/orders/");
  }
  return children;
}
