"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ImageOff, LoaderCircle, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  UPSELL_TYPES,
  upsellRuleInputSchema,
  type AdminProductRow,
  type AdminUpsellRule,
  type DiscountType,
  type UpsellType,
} from "@primegear/shared";
import { formatTaka } from "@primegear/shared/format";
import { Button } from "@primegear/ui/button";
import { cn } from "@primegear/ui/cn";
import { ICON_STROKE } from "@primegear/ui/icon";
import { BottomSheet } from "@primegear/ui/overlay";
import { adminApi, errorMessage } from "@/lib/admin-api";
import { ConfirmSheet } from "./confirm-sheet";
import { Field, Panel, Select, StatusBadge, TextInput, Toggle, controlCls } from "./ui";

const TYPE_LABEL: Record<UpsellType, string> = {
  CART_UPSELL: "After add to cart",
  BUY_TOGETHER: "Buy together (product page)",
  CHECKOUT_UPSELL: "Checkout order bump",
  POST_ORDER: "After the order",
};

type Draft = {
  type: UpsellType;
  name: string;
  offer: { id: string; name: string } | null;
  discountType: DiscountType;
  discountValue: string;
  priority: string;
  isActive: boolean;
};

const newDraft = (): Draft => ({
  type: "CART_UPSELL",
  name: "",
  offer: null,
  discountType: "FIXED",
  discountValue: "0",
  priority: "0",
  isActive: true,
});

const discountText = (r: AdminUpsellRule) =>
  r.discountValue === 0
    ? "No discount"
    : r.discountType === "PERCENT"
      ? `${r.discountValue}% off`
      : `${formatTaka(r.discountValue)} off`;

/** Offers shown when this product is the trigger. Saved on their own, not with the product form. */
export function UpsellManager({ productId }: { productId: string }) {
  const [rules, setRules] = useState<AdminUpsellRule[] | null>(null);
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [toDelete, setToDelete] = useState<AdminUpsellRule | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.upsells(productId).then(setRules, (err) => setLoadError(errorMessage(err)));
  }, [productId]);

  const edit = (r: AdminUpsellRule) =>
    setEditing({
      id: r.id,
      draft: {
        type: r.type,
        name: r.name,
        offer: { id: r.offerProduct.id, name: r.offerProduct.name },
        discountType: r.discountType,
        discountValue: String(r.discountValue),
        priority: String(r.priority),
        isActive: r.isActive,
      },
    });

  return (
    <Panel
      title="Upsell offers"
      description="Products offered with this one, with an optional discount. Changes save right away."
      actions={
        <Button variant="outline" size="sm" onClick={() => setEditing({ id: null, draft: newDraft() })}>
          <Plus size={18} strokeWidth={ICON_STROKE} aria-hidden="true" />
          Add offer
        </Button>
      }
    >
      {loadError && (
        <p role="alert" className="text-sm text-danger">
          {loadError}
        </p>
      )}
      {rules === null && !loadError && <p className="text-sm text-ink-500">Loading offers…</p>}
      {rules?.length === 0 && <p className="text-sm text-ink-500">No offers yet.</p>}
      {rules && rules.length > 0 && (
        <ul className="flex flex-col gap-2">
          {rules.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-tile border border-line-strong p-2.5">
              <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-control bg-surface-sunken text-ink-400">
                {r.offerProduct.imageUrl ? (
                  <Image src={r.offerProduct.imageUrl} alt="" fill sizes="56px" className="object-contain" />
                ) : (
                  <ImageOff size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-copy font-semibold">{r.offerProduct.name}</span>
                <span className="truncate text-caption text-ink-500">
                  {TYPE_LABEL[r.type]} · {discountText(r)}
                </span>
                {!r.isActive && (
                  <span>
                    <StatusBadge status="OFF" />
                  </span>
                )}
              </span>
              <button
                type="button"
                aria-label={`Edit offer ${r.name}`}
                onClick={() => edit(r)}
                className="inline-flex size-11 items-center justify-center rounded-control text-ink-700 active:bg-brand-50"
              >
                <Pencil size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`Delete offer ${r.name}`}
                onClick={() => setToDelete(r)}
                className="inline-flex size-11 items-center justify-center rounded-control text-danger active:bg-danger/10"
              >
                <Trash2 size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <UpsellSheet
          productId={productId}
          ruleId={editing.id}
          initial={editing.draft}
          onClose={() => setEditing(null)}
          onSaved={(rule) => {
            setRules((list) => {
              const rest = (list ?? []).filter((r) => r.id !== rule.id);
              return [...rest, rule].sort((a, b) => b.priority - a.priority);
            });
            setEditing(null);
          }}
        />
      )}

      <ConfirmSheet
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        title="Delete offer?"
        message={`"${toDelete?.offerProduct.name}" will no longer be offered with this product.`}
        onConfirm={async () => {
          if (!toDelete) return;
          await adminApi.deleteUpsell(toDelete.id);
          setRules((list) => list?.filter((r) => r.id !== toDelete.id) ?? null);
        }}
      />
    </Panel>
  );
}

function UpsellSheet({
  productId,
  ruleId,
  initial,
  onClose,
  onSaved,
}: {
  productId: string;
  ruleId: string | null;
  initial: Draft;
  onClose: () => void;
  onSaved: (rule: AdminUpsellRule) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminProductRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let stale = false;
    const t = setTimeout(() => {
      setSearching(true);
      adminApi
        .searchProducts(q)
        .then((rows) => !stale && setResults(rows.filter((r) => r.id !== productId)))
        .catch(() => !stale && setResults([]))
        .finally(() => !stale && setSearching(false));
    }, 250);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [query, productId]);

  const save = async () => {
    setError(null);
    const body = {
      type: draft.type,
      name: draft.name.trim() || (draft.offer ? `${draft.offer.name} offer` : ""),
      triggerProductId: productId,
      triggerCategoryId: null,
      offerProductId: draft.offer?.id ?? "",
      discountType: draft.discountType,
      discountValue: Number(draft.discountValue || 0),
      priority: Number(draft.priority || 0),
      isActive: draft.isActive,
    };
    const parsed = upsellRuleInputSchema.safeParse(body);
    if (!draft.offer) return setError("Choose the product to offer");
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check the fields");
    setBusy(true);
    try {
      onSaved(ruleId ? await adminApi.updateUpsell(ruleId, body) : await adminApi.createUpsell(body));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={ruleId ? "Edit offer" : "New offer"}
      footer={
        <div className="flex flex-col gap-2">
          {error && (
            <p role="alert" className="text-sm font-semibold text-danger">
              {error}
            </p>
          )}
          <Button onClick={save} disabled={busy} className="w-full">
            {busy && <LoaderCircle size={20} className="motion-safe:animate-spin" aria-hidden="true" />}
            Save offer
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Product to offer" id="u-offer">
          {draft.offer ? (
            <div className="flex items-center justify-between gap-2 rounded-btn border-2 border-brand-600 bg-brand-50 px-3.5 py-2">
              <span className="min-w-0 truncate text-copy font-semibold text-brand-800">{draft.offer.name}</span>
              <button
                type="button"
                onClick={() => set("offer", null)}
                className="inline-flex h-11 shrink-0 items-center px-2 text-sm font-semibold text-brand-600"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label className={cn(controlCls, "flex h-12 items-center gap-2.5 px-3.5 text-ink-500 focus-within:border-brand-600 focus-within:ring-1 focus-within:ring-brand-600")}>
                <Search size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
                <input
                  id="u-offer"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products"
                  className="min-w-0 flex-1 bg-transparent text-base text-ink-900 outline-none placeholder:text-ink-500"
                />
                {searching && <LoaderCircle size={18} className="motion-safe:animate-spin" aria-hidden="true" />}
              </label>
              {query.trim().length >= 2 && (
                <ul className="flex max-h-60 flex-col overflow-y-auto rounded-btn border border-line">
                  {results.length === 0 && !searching && (
                    <li className="px-3.5 py-3 text-sm text-ink-500">No products found</li>
                  )}
                  {results.map((r) => (
                    <li key={r.id} className="border-b border-line last:border-0">
                      <button
                        type="button"
                        onClick={() => set("offer", { id: r.id, name: r.name })}
                        className="flex min-h-12 w-full items-center justify-between gap-3 px-3.5 py-2 text-left active:bg-brand-50"
                      >
                        <span className="line-clamp-2 text-copy">{r.name}</span>
                        <span className="shrink-0 text-sm font-bold tabular-nums">{formatTaka(r.price)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Field>
        <Field label="Where it shows" id="u-type">
          <Select id="u-type" value={draft.type} onChange={(e) => set("type", e.target.value as UpsellType)}>
            {UPSELL_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Discount" id="u-discount-type">
            <Select
              id="u-discount-type"
              value={draft.discountType}
              onChange={(e) => set("discountType", e.target.value as DiscountType)}
            >
              <option value="FIXED">Taka off</option>
              <option value="PERCENT">Percent off</option>
            </Select>
          </Field>
          <Field label={draft.discountType === "PERCENT" ? "Percent" : "Amount ৳"} id="u-discount">
            <TextInput
              id="u-discount"
              inputMode="numeric"
              value={draft.discountValue}
              onChange={(e) => set("discountValue", e.target.value.replace(/\D/g, ""))}
            />
          </Field>
        </div>
        <Field label="Internal name" id="u-name" hint="Optional. Only shown in the admin.">
          <TextInput id="u-name" value={draft.name} hasHint onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Priority" id="u-priority" hint="Higher shows first. Up to 3 offers are shown.">
          <TextInput
            id="u-priority"
            inputMode="numeric"
            value={draft.priority}
            hasHint
            onChange={(e) => set("priority", e.target.value.replace(/\D/g, ""))}
          />
        </Field>
        <Toggle id="u-active" label="Active" checked={draft.isActive} onChange={(v) => set("isActive", v)} />
      </div>
    </BottomSheet>
  );
}
