"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CartView, UpsellOffer } from "@primegear/shared";
import { CartApiError, cartApi } from "@/lib/cart-api";
import { CartDrawer } from "./cart-drawer";
import { UpsellSheet } from "./upsell-sheet";

export type CartNotice = { code: string; message: string };

type AddOptions = {
  /** Used to look up upsell offers after adding */
  productId: string;
  /** From an upsell offer: records the rule + upsellSource and applies its discount */
  upsellRuleId?: string;
  /** false = open the cart drawer straight away instead of offering upsells */
  offerUpsells?: boolean;
  /** "none" leaves the UI alone (the caller navigates, e.g. Order Now -> checkout) */
  afterAdd?: "default" | "none";
};

type CartContextValue = {
  cart: CartView | null;
  itemCount: number;
  busy: boolean;
  notice: CartNotice | null;
  dismissNotice: () => void;
  openCart: () => void;
  closeCart: () => void;
  drawerOpen: boolean;
  add: (variantId: string, quantity: number, options: AddOptions) => Promise<boolean>;
  setQuantity: (itemId: string, quantity: number) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
  offers: UpsellOffer[] | null;
  closeOffers: () => void;
  /** Re-read the cart from the server (after an order, the cart is empty) */
  refresh: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

const toNotice = (err: unknown): CartNotice =>
  err instanceof CartApiError
    ? { code: err.code, message: err.message }
    : { code: "UNKNOWN", message: "Something went wrong. Please try again." };

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartView | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<CartNotice | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [offers, setOffers] = useState<UpsellOffer[] | null>(null);

  useEffect(() => {
    cartApi.get().then(setCart, () => undefined); // an unreachable API just means an empty-looking cart
  }, []);

  const run = useCallback(async (action: () => Promise<CartView>) => {
    setBusy(true);
    setNotice(null);
    try {
      setCart(await action());
      return true;
    } catch (err) {
      setNotice(toNotice(err));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const add = useCallback<CartContextValue["add"]>(
    async (
      variantId,
      quantity,
      { productId, upsellRuleId, offerUpsells = true, afterAdd = "default" },
    ) => {
      const ok = await run(() => cartApi.add({ variantId, quantity, upsellRuleId }));
      if (!ok) {
        setOffers(null);
        setDrawerOpen(true); // the drawer shows the reason (limit, stock) and the WhatsApp prompt
        return false;
      }
      if (afterAdd === "none") return true;
      if (upsellRuleId) return true; // added from the offers sheet: it stays open
      if (offerUpsells) {
        const found = await cartApi.upsells(productId).catch(() => []);
        if (found.length > 0) {
          setOffers(found);
          return true;
        }
      }
      setDrawerOpen(true);
      return true;
    },
    [run],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      itemCount: cart?.itemCount ?? 0,
      busy,
      notice,
      dismissNotice: () => setNotice(null),
      drawerOpen,
      openCart: () => {
        setOffers(null);
        setDrawerOpen(true);
      },
      closeCart: () => setDrawerOpen(false),
      add,
      setQuantity: async (itemId, quantity) =>
        void (await run(() => cartApi.update(itemId, quantity))),
      remove: async (itemId) => void (await run(() => cartApi.remove(itemId))),
      offers,
      closeOffers: () => setOffers(null),
      refresh: async () => {
        setCart(await cartApi.get().catch(() => null));
      },
    }),
    [cart, busy, notice, drawerOpen, offers, add, run],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer />
      <UpsellSheet />
    </CartContext.Provider>
  );
}
