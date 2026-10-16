import type { ProductDetail } from "@primegear/shared";
import { Accordion, type AccordionItem } from "@primegear/ui/accordion";
import { DeliveryInfo, SpecRows } from "./delivery-info";

/**
 * One white panel: Specifications and What's in the box open, Delivery and replacement closed.
 * The description sits last, collapsed; it stays in the HTML for search engines.
 */
export function ProductDetails({
  product,
}: {
  product: Pick<ProductDetail, "specs" | "boxContents" | "brand" | "description">;
}) {
  const specRows: [string, string][] = product.specs.map((s) => [s.label, s.value]);
  if (product.brand && !product.specs.some((s) => s.label.toLowerCase() === "brand")) {
    specRows.push(["Brand", product.brand.name]);
  }

  const items: AccordionItem[] = [
    ...(specRows.length
      ? [
          {
            id: "specs",
            title: "Specifications",
            defaultOpen: true,
            content: <SpecRows rows={specRows} />,
          },
        ]
      : []),
    ...(product.boxContents.length
      ? [
          {
            id: "box",
            title: "What's in the box",
            defaultOpen: true,
            content: (
              <ul className="grid grid-cols-2 gap-x-3 gap-y-2 px-4 pb-3.5 text-sm text-ink-700 xl:grid-cols-4">
                {product.boxContents.map((b) => (
                  <li key={b.item} className="flex gap-1.5">
                    <span className="font-bold tabular-nums text-brand-600">{b.qty}×</span>
                    {b.item}
                  </li>
                ))}
              </ul>
            ),
          },
        ]
      : []),
    { id: "delivery", title: "Delivery and replacement", content: <DeliveryInfo /> },
    ...(product.description
      ? [
          {
            id: "description",
            title: "Description",
            content: (
              <p className="whitespace-pre-line px-4 pb-4 text-base leading-body text-ink-700">
                {product.description}
              </p>
            ),
          },
        ]
      : []),
  ];

  return <Accordion items={items} className="mx-4 mt-4 md:mx-0 md:mt-0" />;
}
