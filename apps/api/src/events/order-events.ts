import { logger } from "../lib/logger";

/**
 * In-process order events, emitted only after the change is committed. Listeners must be quick and
 * hand slow work to BullMQ (Step 12 hooks the server-side Purchase job onto "order.confirmed").
 * A failing listener is logged and never fails the admin request that caused the event.
 */
export type OrderConfirmedEvent = {
  storeId: string;
  orderId: string;
  orderNumber: string;
  /** Order total at confirmation, BDT */
  total: number;
  placedAt: Date;
  confirmedAt: Date;
  adminUserId: string;
  /** Confirmed more than LATE_CONFIRM_DAYS after it was placed (outside the ad platforms' window) */
  lateConfirmation: boolean;
};

type OrderEventMap = {
  "order.confirmed": OrderConfirmedEvent;
};

type Listener<K extends keyof OrderEventMap> = (event: OrderEventMap[K]) => unknown;

const listeners = new Map<keyof OrderEventMap, Set<(event: never) => unknown>>();

export const orderEvents = {
  /** Returns an unsubscribe function */
  on<K extends keyof OrderEventMap>(name: K, listener: Listener<K>) {
    let set = listeners.get(name);
    if (!set) listeners.set(name, (set = new Set()));
    set.add(listener);
    return () => void set.delete(listener);
  },

  emit<K extends keyof OrderEventMap>(name: K, event: OrderEventMap[K]) {
    for (const listener of (listeners.get(name) ?? []) as Set<Listener<K>>) {
      try {
        Promise.resolve(listener(event)).catch((err: unknown) =>
          logger.error({ err, event: name, orderId: event.orderId }, "order event listener failed"),
        );
      } catch (err) {
        logger.error({ err, event: name, orderId: event.orderId }, "order event listener failed");
      }
    }
  },
};
