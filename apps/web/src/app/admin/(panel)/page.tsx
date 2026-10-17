import { redirect } from "next/navigation";

// Orders are the first screen for every role
export default function AdminHome() {
  redirect("/admin/orders/");
}
