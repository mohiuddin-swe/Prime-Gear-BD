import Link from "next/link";
import { cn } from "@primegear/ui/cn";

/** 20 px section title with an optional "See all" link on the same baseline. */
export function SectionHeading({
  title,
  id,
  href,
  linkLabel = "See all",
  className,
}: {
  title: string;
  id?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", className)}>
      <h2 id={id} className="font-heading text-xl font-bold tracking-heading text-ink-900 md:text-2xl">
        {title}
      </h2>
      {href && (
        // 14 px text link; the pseudo-element gives it a 44 px tall hit area without moving the layout
        <Link
          href={href}
          className="relative text-sm font-semibold text-brand-600 after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] active:text-brand-800"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
