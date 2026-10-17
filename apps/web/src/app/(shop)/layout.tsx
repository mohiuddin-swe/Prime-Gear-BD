import { ShopChrome } from "@/components/layout/shop-chrome";

/** Every storefront page. /admin has its own shell and never loads the cart or tracking capture. */
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <ShopChrome>{children}</ShopChrome>;
}
