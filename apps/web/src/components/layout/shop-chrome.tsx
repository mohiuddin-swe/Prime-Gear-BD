import { AttributionCapture } from "@/components/tracking/attribution-capture";
import { CartProvider } from "@/components/cart/cart-provider";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

/** Storefront frame: attribution capture, cart, header, footer and the mobile bottom navigation. */
export function ShopChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AttributionCapture />
      <CartProvider>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
        <BottomNav />
      </CartProvider>
    </>
  );
}
