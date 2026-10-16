import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "outline" | "ghost";

/** Classes only, so links (`<a>` / next/link) can look like buttons too. */
export function buttonClasses(variant: ButtonVariant = "primary", className?: string) {
  return cn(
    // 48 px tall on mobile, 44 px from md up; never below the 44 px tap target
    "inline-flex h-12 min-w-11 select-none items-center justify-center gap-2 rounded-btn px-5 text-base font-semibold transition",
    "md:h-11 motion-safe:active:-translate-y-px",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
    "disabled:pointer-events-none disabled:opacity-50",
    variant === "primary" && "bg-brand-gradient text-white shadow-card active:shadow-card-lift",
    variant === "outline" && "border-2 border-brand-600 bg-white text-brand-600 active:bg-brand-50",
    variant === "ghost" && "text-brand-600 active:bg-brand-50",
    className,
  );
}

type Common = { variant?: ButtonVariant };

export function Button({
  variant,
  className,
  type = "button",
  ...props
}: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={buttonClasses(variant, className)} {...props} />;
}

export function ButtonLink({
  variant,
  className,
  ...props
}: Common & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a className={buttonClasses(variant, className)} {...props} />;
}
