import type { Prisma } from "@primegear/db";
import { getPrisma } from "../lib/prisma";
import type { PricingSettings } from "./pricing.service";

/** Setting keys (key/value per store). Admin screens will edit these later. */
export const SETTING_KEYS = {
  insideDhakaFee: "shipping.insideDhaka",
  outsideDhakaFee: "shipping.outsideDhaka",
  freeDeliveryThreshold: "shipping.freeDeliveryThreshold",
  insideDhakaEta: "shipping.insideDhakaEta",
  outsideDhakaEta: "shipping.outsideDhakaEta",
  whatsapp: "contact.whatsapp",
} as const;

// Used when a store hasn't configured the setting yet
export const SETTING_DEFAULTS = {
  insideDhakaFee: 60,
  outsideDhakaFee: 110,
  freeDeliveryThreshold: null as number | null,
  insideDhakaEta: "1–2 days",
  outsideDhakaEta: "2–4 days",
};

const asInt = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : fallback;

const asText = (v: unknown, fallback: string) =>
  typeof v === "string" && v.trim() ? v.trim() : fallback;

export type StoreSettings = PricingSettings & {
  /** Delivery time shown next to each zone's fee, e.g. "1–2 days" */
  deliveryEta: { insideDhaka: string; outsideDhaka: string };
  whatsappNumber: string | null;
};

/** Read fresh each time: carts must never price with a stale shipping fee. A handful of rows by unique key. */
export async function getStoreSettings(
  storeId: string,
  db: Prisma.TransactionClient = getPrisma(),
): Promise<StoreSettings> {
  const rows = await db.setting.findMany({
    where: { storeId, key: { in: Object.values(SETTING_KEYS) } },
    select: { key: true, value: true },
  });
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const threshold = byKey.get(SETTING_KEYS.freeDeliveryThreshold);
  const whatsapp = byKey.get(SETTING_KEYS.whatsapp);
  return {
    insideDhakaFee: asInt(byKey.get(SETTING_KEYS.insideDhakaFee), SETTING_DEFAULTS.insideDhakaFee),
    outsideDhakaFee: asInt(
      byKey.get(SETTING_KEYS.outsideDhakaFee),
      SETTING_DEFAULTS.outsideDhakaFee,
    ),
    freeDeliveryThreshold:
      typeof threshold === "number" && Number.isInteger(threshold) && threshold > 0
        ? threshold
        : null,
    deliveryEta: {
      insideDhaka: asText(byKey.get(SETTING_KEYS.insideDhakaEta), SETTING_DEFAULTS.insideDhakaEta),
      outsideDhaka: asText(
        byKey.get(SETTING_KEYS.outsideDhakaEta),
        SETTING_DEFAULTS.outsideDhakaEta,
      ),
    },
    whatsappNumber: typeof whatsapp === "string" && whatsapp.trim() ? whatsapp.trim() : null,
  };
}
