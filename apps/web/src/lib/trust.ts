import type { TrustItem } from "@primegear/ui";

export const trustItems: TrustItem[] = [
  { icon: "cod", title: "Cash on delivery", caption: "Pay when you receive" },
  { icon: "delivery", title: "Fast delivery", caption: "All over Bangladesh" },
  { icon: "warranty", title: "Warranty", caption: "Genuine products" },
  { icon: "whatsapp", title: "WhatsApp support", caption: "Chat with us" },
];

/** Home page strip: three short promises, icon over label */
export const homeTrustItems: TrustItem[] = [
  { icon: "cod", title: "Cash on delivery" },
  { icon: "delivery", title: "7-day replacement" },
  { icon: "whatsapp", title: "WhatsApp support" },
];
