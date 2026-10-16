import type { ReactNode } from "react";
import { Boxes, ChevronDown, FileText, Layers, Package, Palette, Tag } from "lucide-react";
import type { ProductDetail } from "@primegear/shared";
import { ICON_STROKE } from "@primegear/ui";

type Row = { Icon: typeof Tag; label: string; value: string };

function Accordion({
  title,
  Icon,
  defaultOpen,
  children,
}: {
  title: string;
  Icon: typeof Tag;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group rounded-card bg-white shadow-card">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 [&::-webkit-details-marker]:hidden">
        <Icon size={24} strokeWidth={ICON_STROKE} className="text-brand-600" aria-hidden="true" />
        <span className="flex-1 text-base font-semibold">{title}</span>
        <ChevronDown
          size={24}
          strokeWidth={ICON_STROKE}
          aria-hidden="true"
          className="transition-transform group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="border-t border-ink-900/10 px-4 py-3">{children}</div>
    </details>
  );
}

function Rows({ rows }: { rows: Row[] }) {
  return (
    <dl className="space-y-1">
      {rows.map(({ Icon, label, value }) => (
        <div key={label} className="flex min-h-11 items-center gap-3">
          <Icon
            size={20}
            strokeWidth={ICON_STROKE}
            className="shrink-0 text-brand-600"
            aria-hidden="true"
          />
          <dt className="w-28 shrink-0 text-base text-ink-900/70">{label}</dt>
          <dd className="min-w-0 text-base font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SpecAccordions({ product }: { product: ProductDetail }) {
  const details: Row[] = [
    ...(product.brand ? [{ Icon: Tag, label: "Brand", value: product.brand.name }] : []),
    ...(product.category
      ? [{ Icon: Layers, label: "Category", value: product.category.name }]
      : []),
    ...(product.variants.length === 1
      ? [{ Icon: Boxes, label: "SKU", value: product.variants[0]!.sku }]
      : []),
  ];

  // Option values across all variants, grouped by attribute (Color: Black, White)
  const options = new Map<string, Set<string>>();
  for (const v of product.variants)
    for (const a of v.attributes)
      options.set(a.attribute, (options.get(a.attribute) ?? new Set()).add(a.value));
  const optionRows: Row[] = [...options].map(([label, values]) => ({
    Icon: Palette,
    label,
    value: [...values].join(", "),
  }));

  return (
    <section aria-label="Product information" className="space-y-3">
      {details.length > 0 && (
        <Accordion title="Product details" Icon={Package} defaultOpen>
          <Rows rows={details} />
        </Accordion>
      )}
      {optionRows.length > 0 && (
        <Accordion title="Available options" Icon={Palette}>
          <Rows rows={optionRows} />
        </Accordion>
      )}
      {product.description && (
        <Accordion title="Description" Icon={FileText} defaultOpen>
          <p className="whitespace-pre-line text-base">{product.description}</p>
        </Accordion>
      )}
    </section>
  );
}
