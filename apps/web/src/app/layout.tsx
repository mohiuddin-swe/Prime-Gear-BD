import type { Metadata } from "next";
import { Hind_Siliguri, Inter, Plus_Jakarta_Sans } from "next/font/google";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

// Variable fonts: one file covers the whole weight range (Jakarta 600-800, Inter 400-600) instead of one file per weight.
const heading = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-heading" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
// Not variable and only needed when Bangla text is on the page, so it isn't preloaded
const bangla = Hind_Siliguri({
  subsets: ["bengali"],
  weight: ["400", "500", "600"],
  variable: "--font-bangla",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: "Smart home, LED lighting, electronics and gadgets in Bangladesh.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable} ${bangla.variable}`}>
      {/* Storefront chrome lives in (shop)/layout.tsx; /admin brings its own shell */}
      <body className="font-sans text-base text-ink-900">{children}</body>
    </html>
  );
}
