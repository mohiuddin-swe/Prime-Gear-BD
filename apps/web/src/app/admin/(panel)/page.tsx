import { redirect } from "next/navigation";

// The catalog is the first admin area; the orders dashboard will take this route later
export default function AdminHome() {
  redirect("/admin/products/");
}
