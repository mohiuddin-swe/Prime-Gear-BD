import type { ReactNode } from "react";
import { cn } from "./cn";

/** Dark showcase block: ink-950 with a soft blue glow top-left and cyan glow bottom-right. */
export function SectionDark({
  children,
  className,
  contentClassName,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={cn("relative isolate overflow-hidden bg-ink-950 text-white", className)}>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-glow-blue" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-glow-cyan" />
      <div className={cn("mx-auto w-full max-w-7xl px-4 py-10 md:px-6 md:py-14", contentClassName)}>
        {children}
      </div>
    </section>
  );
}
