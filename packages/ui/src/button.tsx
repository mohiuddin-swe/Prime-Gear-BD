import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "outline" | "ghost" | "outline-dark";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

type Options = { variant?: ButtonVariant; size?: ButtonSize };

/** Classes only, so links (`<a>` / next/link) can look like buttons too. */
export function buttonClasses(options: ButtonVariant | Options = {}, className?: string) {
  const { variant = "primary", size = "md" } =
    typeof options === "string" ? { variant: options } : options;
  return cn(
    "inline-flex min-w-11 select-none items-center whitespace-nowrap justify-center gap-2 transition",
    "motion-safe:active:-translate-y-px",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
    "disabled:pointer-events-none disabled:opacity-50",
    // md: 48 px on mobile, 44 px from md up (never below the tap target); lg: 54 px bar CTA
    size === "md" && "h-12 rounded-btn px-5 text-base font-semibold md:h-11",
    size === "lg" && "h-13.5 rounded-btn px-5 text-lead font-bold",
    // icon: 52 px square beside a lg CTA (add to cart)
    size === "icon" && "size-13 rounded-btn",
    // sm: 40 px visual, 44 px hit area (inline add-ons such as "+ Add ৳590")
    size === "sm" &&
      "relative h-10 rounded-control px-3 text-sm font-semibold after:absolute after:-inset-y-0.5 after:inset-x-0 after:content-['']",
    variant === "primary" && "bg-brand-gradient text-white shadow-cta",
    variant === "outline" && "border border-brand-600 bg-white text-brand-600 active:bg-brand-50",
    variant === "ghost" && "text-brand-600 active:bg-brand-50",
    variant === "outline-dark" && "border border-white/35 text-white active:bg-white/10",
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: Options & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={buttonClasses({ variant, size }, className)} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: Options & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a className={buttonClasses({ variant, size }, className)} {...props} />;
}
