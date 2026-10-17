import Link from "next/link";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@primegear/ui/cn";
import { ICON_STROKE } from "@primegear/ui/icon";

// Admin building blocks on the brand tokens: same inputs, radii and shadows as the storefront checkout.

/** 48 px controls with 16 px text (no iOS zoom); 2 px brand focus ring without layout shift */
export const controlCls =
  "w-full rounded-btn border border-line-strong bg-white text-base text-ink-900 outline-none placeholder:text-ink-500 focus:border-brand-600 focus:ring-1 focus:ring-brand-600 disabled:bg-surface-sunken disabled:text-ink-500 aria-[invalid=true]:border-danger";

export function PageTitle({
  title,
  description,
  back,
  actions,
}: {
  title: string;
  description?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        {back && (
          <Link
            href={back.href}
            className="-ml-1 inline-flex min-h-11 items-center gap-1 self-start text-sm font-semibold text-brand-600"
          >
            <ChevronLeft size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
            {back.label}
          </Link>
        )}
        <h1 className="font-heading text-title font-extrabold tracking-heading text-ink-950 md:text-2xl">
          {title}
        </h1>
        {description && <p className="text-sm text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  id,
}: {
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={title && id ? `${id}-title` : undefined}
      className={cn("flex flex-col gap-4 rounded-panel bg-white p-4 shadow-card md:p-6", className)}
    >
      {title && (
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 id={id ? `${id}-title` : undefined} className="font-heading text-lead font-bold text-ink-950">
              {title}
            </h2>
            {description && <p className="text-sm text-ink-500">{description}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

type FieldProps = {
  label: string;
  id: string;
  hint?: ReactNode;
  error?: string;
  /** Right-aligned next to the label, e.g. a character counter */
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function Field({ label, id, hint, error, aside, className, children }: FieldProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold text-ink-700">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-caption text-ink-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

const described = (id: string | undefined, error?: string, hint?: boolean) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

export function TextInput({
  error,
  hasHint,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { error?: string; hasHint?: boolean }) {
  return (
    <input
      aria-invalid={error ? true : undefined}
      aria-describedby={described(props.id, error, hasHint)}
      className={cn(controlCls, "h-12 px-3.5", className)}
      {...props}
    />
  );
}

export function TextArea({
  error,
  hasHint,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string; hasHint?: boolean }) {
  return (
    <textarea
      aria-invalid={error ? true : undefined}
      aria-describedby={described(props.id, error, hasHint)}
      className={cn(controlCls, "min-h-28 px-3.5 py-3 leading-body", className)}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(controlCls, "h-12 px-3", className)} {...props} />;
}

/** Character counter for SEO fields: turns danger past the limit */
export function Counter({ value, max }: { value: string; max: number }) {
  return (
    <span className={cn("text-xs tabular-nums", value.length > max ? "text-danger" : "text-ink-500")}>
      {value.length}/{max}
    </span>
  );
}

/** 44 px switch row. A real checkbox underneath, so it works with keyboard and screen readers. */
export function Toggle({
  label,
  description,
  checked,
  onChange,
  id,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id: string;
}) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
      <span className="flex flex-col">
        <span className="text-copy font-semibold text-ink-900">{label}</span>
        {description && <span className="text-caption text-ink-500">{description}</span>}
      </span>
      <span className="relative inline-flex shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer absolute inset-0 size-full cursor-pointer opacity-0"
        />
        <span
          aria-hidden="true"
          className="h-7 w-12 rounded-full bg-line-stronger transition peer-checked:bg-brand-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-600"
        />
        <span
          aria-hidden="true"
          className="absolute left-0.5 top-0.5 size-6 rounded-full bg-white shadow-card transition peer-checked:translate-x-5"
        />
      </span>
    </label>
  );
}

const STATUS_STYLE = {
  ACTIVE: "bg-success/10 text-success-ink",
  DRAFT: "bg-surface-sunken text-ink-700",
  ARCHIVED: "bg-ink-900/10 text-ink-700",
  ON: "bg-success/10 text-success-ink",
  OFF: "bg-surface-sunken text-ink-500",
} as const;

const STATUS_LABEL = { ACTIVE: "Active", DRAFT: "Draft", ARCHIVED: "Archived", ON: "Visible", OFF: "Hidden" };

export function StatusBadge({ status }: { status: keyof typeof STATUS_STYLE }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold",
        STATUS_STYLE[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-panel bg-white px-6 py-12 text-center shadow-card">
      <p className="font-heading text-lead font-bold text-ink-950">{title}</p>
      {children && <div className="text-sm text-ink-500">{children}</div>}
    </div>
  );
}

/** Previous / next links that keep the current filters. Hidden when everything fits on one page. */
export function Pagination({
  page,
  limit,
  total,
  href,
}: {
  page: number;
  limit: number;
  total: number;
  href: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  const link =
    "inline-flex h-11 items-center gap-1 rounded-btn border border-line-strong bg-white px-3.5 text-sm font-semibold text-ink-900 active:bg-brand-50";
  const disabled = "pointer-events-none opacity-40";
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3">
      <Link
        href={href(page - 1)}
        aria-disabled={page <= 1}
        tabIndex={page <= 1 ? -1 : undefined}
        className={cn(link, page <= 1 && disabled)}
      >
        <ChevronLeft size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
        Previous
      </Link>
      <span className="text-sm tabular-nums text-ink-500">
        Page {page} of {pages}
      </span>
      <Link
        href={href(page + 1)}
        aria-disabled={page >= pages}
        tabIndex={page >= pages ? -1 : undefined}
        className={cn(link, page >= pages && disabled)}
      >
        Next
        <ChevronRight size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
      </Link>
    </nav>
  );
}

/** "Saved" / error line under a form, announced to screen readers */
export function FormStatus({ status }: { status: { kind: "ok" | "error"; text: string } | null }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn(
        "text-sm font-semibold",
        status?.kind === "error" ? "text-danger" : "text-success-ink",
        !status && "sr-only",
      )}
    >
      {status?.text ?? ""}
    </p>
  );
}

/** First error message for a field path, from a Zod-style issue list or API message */
export type FieldErrors = Record<string, string>;
