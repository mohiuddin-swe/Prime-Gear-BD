import type { ComponentType, ReactNode } from "react";
import { cn } from "./cn";

export type LinkLike = ComponentType<{
  href: string;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
  "aria-current"?: "page";
}>;

export const DefaultLink: LinkLike = ({ href, children, ...props }) => (
  <a href={href} {...props}>
    {children}
  </a>
);

export const iconButtonClasses =
  "relative inline-flex size-11 shrink-0 select-none items-center justify-center rounded-btn text-ink-900 transition active:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

type IconButtonProps = {
  /** Required: icon-only controls need an accessible name */
  label: string;
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  LinkComponent?: LinkLike;
  className?: string;
};

/** 44 px square icon control (menu, WhatsApp, cart, back, close). A link when `href` is given. */
export function IconButton({
  label,
  children,
  href,
  onClick,
  LinkComponent = DefaultLink,
  className,
}: IconButtonProps) {
  if (href) {
    return (
      <LinkComponent href={href} aria-label={label} className={cn(iconButtonClasses, className)}>
        {children}
      </LinkComponent>
    );
  }
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(iconButtonClasses, className)}
    >
      {children}
    </button>
  );
}

/** Small count bubble for cart icons. Renders nothing at 0. */
export function CountBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex items-center justify-center rounded-full bg-brand-600 font-semibold tabular-nums leading-none text-white",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
