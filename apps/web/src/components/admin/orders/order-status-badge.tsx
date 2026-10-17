import { ORDER_STATUS_LABEL, type OrderStatus } from "@primegear/shared/orders";
import { cn } from "@primegear/ui/cn";

// Blue = waiting on us, green = done, red = lost. Amber stays reserved for deals.
const STYLE: Record<OrderStatus, string> = {
  PENDING: "bg-brand-50 text-brand-800",
  CONFIRMED: "bg-brand-600 text-white",
  PACKED: "bg-ink-900/10 text-ink-900",
  SHIPPED: "bg-ink-900 text-white",
  DELIVERED: "bg-success/10 text-success-ink",
  PARTIAL_DELIVERED: "bg-success/10 text-success-ink",
  CANCELLED: "bg-danger/10 text-danger-ink",
  RETURNED: "bg-danger/10 text-danger-ink",
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-xs font-semibold",
        STYLE[status],
        className,
      )}
    >
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}
