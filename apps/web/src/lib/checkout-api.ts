import type { CartView, CreateOrderInput, OrderCreated, ShippingZone } from "@primegear/shared";
import { call } from "./cart-api";

export type Quote = CartView & { zone: ShippingZone | null };

type OrderBody = Omit<CreateOrderInput, "paymentMethod" | "phone" | "tracking"> & {
  phone: string;
  paymentMethod: "COD";
  tracking: Record<string, string | undefined>;
};

export const checkoutApi = {
  quote: (district?: string) =>
    call<Quote>("/checkout/quote", { method: "POST", body: district ? { district } : {} }),
  createOrder: (body: OrderBody) => call<OrderCreated>("/orders", { method: "POST", body }),
  saveIncomplete: (body: {
    name?: string;
    phone: string;
    address?: string;
    district?: string;
    thana?: string;
    tracking: Record<string, string | undefined>;
  }) => call<{ saved: boolean }>("/incomplete-orders", { method: "POST", body }),
};
