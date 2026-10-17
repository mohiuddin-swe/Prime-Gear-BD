import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · Prime Gear BD" },
  robots: { index: false, follow: false },
};

/** Everything under /admin: never indexed. The panel layout below adds the session check and shell. */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
