import type { Metadata } from "next";
import { Hind_Siliguri, Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const heading = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-heading",
});
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const bangla = Hind_Siliguri({
  subsets: ["bengali"],
  weight: ["400", "500", "600"],
  variable: "--font-bangla",
});

export const metadata: Metadata = {
  title: "Prime Gear BD",
  description: "Smart home, LED lighting, electronics and gadgets in Bangladesh.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable} ${bangla.variable}`}>
      <body className="font-sans text-base text-ink-900">{children}</body>
    </html>
  );
}
