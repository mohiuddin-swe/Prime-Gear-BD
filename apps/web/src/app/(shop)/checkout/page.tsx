import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export const metadata: Metadata = {
  title: "Checkout | Prime Gear BD",
  alternates: { canonical: "/checkout/" },
  robots: { index: false, follow: false }, // personal, per-visitor page
};

export default function CheckoutPage() {
  return <CheckoutForm />;
}
