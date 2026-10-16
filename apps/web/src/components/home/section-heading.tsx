import Link from "next/link";

export function SectionHeading({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-heading text-xl font-bold md:text-2xl">{title}</h2>
      {href && (
        <Link
          href={href}
          className="flex min-h-11 items-center text-base font-semibold text-brand-600"
        >
          View all
        </Link>
      )}
    </div>
  );
}
