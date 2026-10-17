"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { LoaderCircle, Plus, Star, Trash2, X } from "lucide-react";
import {
  PRODUCT_STATUSES,
  productInputSchema,
  slugify,
  type AdminCatalogOptions,
  type AdminProduct,
  type ProductInput,
} from "@primegear/shared";
import { Button } from "@primegear/ui/button";
import { cn } from "@primegear/ui/cn";
import { ICON_STROKE } from "@primegear/ui/icon";
import { adminApi, errorMessage } from "@/lib/admin-api";
import { uuid } from "@/lib/utils";
import { ConfirmSheet } from "./confirm-sheet";
import { Counter, Field, Panel, Select, TextArea, TextInput, Toggle, type FieldErrors } from "./ui";

// ───────────── Draft state (strings while typing, converted on save) ─────────────

type VariantDraft = {
  key: string;
  id?: string;
  name: string;
  sku: string;
  price: string;
  comparePrice: string;
  stock: string;
  isDefault: boolean;
  isActive: boolean;
  attributes: { key: string; attribute: string; value: string }[];
};
type TierDraft = { key: string; variantKey: string; minQty: string; unitPrice: string; label: string };
type SpecDraft = { key: string; label: string; value: string };

type Draft = {
  name: string;
  slug: string;
  /** New products follow the name until the slug is edited by hand */
  slugTouched: boolean;
  status: (typeof PRODUCT_STATUSES)[number];
  categoryId: string;
  brandId: string;
  subtitle: string;
  shortDescription: string;
  description: string;
  isFeatured: boolean;
  tags: string;
  seoTitle: string;
  seoDescription: string;
  specs: SpecDraft[];
  variants: VariantDraft[];
  tiers: TierDraft[];
};

const ALL_VARIANTS = "";

// Keys of rows that exist on the first render must match between server and client HTML (they end
// up in id/htmlFor), so they are derived; rows added later in the browser get a uuid.
const emptyVariant = (key = uuid()): VariantDraft => ({
  key,
  name: "Default",
  sku: "",
  price: "",
  comparePrice: "",
  stock: "0",
  isDefault: false,
  isActive: true,
  attributes: [],
});

function toDraft(p: AdminProduct | null): Draft {
  if (!p) {
    return {
      name: "",
      slug: "",
      slugTouched: false,
      status: "DRAFT",
      categoryId: "",
      brandId: "",
      subtitle: "",
      shortDescription: "",
      description: "",
      isFeatured: false,
      tags: "",
      seoTitle: "",
      seoDescription: "",
      specs: [],
      variants: [{ ...emptyVariant("new-0"), isDefault: true }],
      tiers: [],
    };
  }
  const variants: VariantDraft[] = p.variants.map((v) => ({
    key: v.id,
    id: v.id,
    name: v.name,
    sku: v.sku,
    price: String(v.price),
    comparePrice: v.comparePrice === null ? "" : String(v.comparePrice),
    stock: String(v.stock),
    isDefault: v.isDefault,
    isActive: v.isActive,
    attributes: v.attributes.map((a, i) => ({ key: `${v.id}-a${i}`, ...a })),
  }));
  return {
    name: p.name,
    slug: p.slug,
    slugTouched: true,
    status: p.status,
    categoryId: p.categoryId ?? "",
    brandId: p.brandId ?? "",
    subtitle: p.subtitle ?? "",
    shortDescription: p.shortDescription ?? "",
    description: p.description ?? "",
    isFeatured: p.isFeatured,
    tags: p.tags.join(", "),
    seoTitle: p.seoTitle ?? "",
    seoDescription: p.seoDescription ?? "",
    specs: (p.specs ?? []).map((s, i) => ({ key: `spec-${i}`, ...s })),
    variants,
    tiers: p.bulkTiers.map((t) => ({
      key: t.id,
      variantKey: t.variantId ?? ALL_VARIANTS,
      minQty: String(t.minQty),
      unitPrice: String(t.unitPrice),
      label: t.label ?? "",
    })),
  };
}

/** "" → NaN so the schema reports "Enter a number" instead of silently saving 0 */
const num = (s: string) => (s.trim() === "" ? Number.NaN : Number(s));

function toInput(d: Draft): ProductInput {
  return {
    name: d.name,
    slug: d.slug,
    status: d.status,
    categoryId: d.categoryId || null,
    brandId: d.brandId || null,
    subtitle: d.subtitle,
    shortDescription: d.shortDescription,
    description: d.description,
    isFeatured: d.isFeatured,
    tags: d.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    seoTitle: d.seoTitle,
    seoDescription: d.seoDescription,
    specs: d.specs.filter((s) => s.label.trim() || s.value.trim()).map(({ label, value }) => ({ label, value })),
    variants: d.variants.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: num(v.price),
      comparePrice: v.comparePrice.trim() === "" ? null : num(v.comparePrice),
      stock: num(v.stock),
      isDefault: v.isDefault,
      isActive: v.isActive,
      attributes: v.attributes
        .filter((a) => a.attribute.trim() || a.value.trim())
        .map(({ attribute, value }) => ({ attribute, value })),
    })),
    bulkTiers: d.tiers.map((t) => {
      const index = d.variants.findIndex((v) => v.key === t.variantKey);
      return {
        variantIndex: index === -1 ? null : index,
        minQty: num(t.minQty),
        unitPrice: num(t.unitPrice),
        label: t.label,
      };
    }),
  };
}

function issuesToErrors(issues: { path: PropertyKey[]; message: string; code?: string }[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    const message = issue.code === "invalid_type" ? "Enter a number" : issue.message;
    errors[key] ??= message;
  }
  return errors;
}

// ───────────── Form ─────────────

export function ProductForm({
  product,
  options,
  children,
}: {
  product: AdminProduct | null;
  options: AdminCatalogOptions;
  /** Edit page only: image and upsell managers, rendered in the main column (they save on their own) */
  children?: ReactNode;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => toDraft(product));
  const [saved, setSaved] = useState(() => JSON.stringify(toInput(toDraft(product))));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dirty = JSON.stringify(toInput(draft)) !== saved;
  // "Saved" goes away as soon as something is edited again
  const shownStatus = status?.kind === "ok" && dirty ? null : status;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setVariant = (key: string, patch: Partial<VariantDraft>) =>
    setDraft((d) => ({
      ...d,
      variants: d.variants.map((v) =>
        v.key === key
          ? { ...v, ...patch }
          : patch.isDefault // one default at a time
            ? { ...v, isDefault: false }
            : v,
      ),
    }));
  const setTier = (key: string, patch: Partial<TierDraft>) =>
    setDraft((d) => ({ ...d, tiers: d.tiers.map((t) => (t.key === key ? { ...t, ...patch } : t)) }));
  const setSpec = (key: string, patch: Partial<SpecDraft>) =>
    setDraft((d) => ({ ...d, specs: d.specs.map((s) => (s.key === key ? { ...s, ...patch } : s)) }));

  const attributeNames = useMemo(() => options.attributes.map((a) => a.name), [options.attributes]);
  const valuesFor = (name: string) =>
    options.attributes.find((a) => a.name.toLowerCase() === name.trim().toLowerCase())?.values ?? [];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus(null);
    const input = toInput(draft);
    const parsed = productInputSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(issuesToErrors(parsed.error.issues));
      setStatus({ kind: "error", text: "Fix the highlighted fields" });
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      if (product) {
        const updated = await adminApi.updateProduct(product.id, input);
        const next = toDraft(updated);
        setDraft(next);
        setSaved(JSON.stringify(toInput(next)));
        setStatus({ kind: "ok", text: "Saved" });
        router.refresh();
      } else {
        const created = await adminApi.createProduct(input);
        setSaved(JSON.stringify(input)); // no unload warning while navigating away
        router.replace(`/admin/products/${created.id}/?created=1`);
      }
    } catch (err) {
      setStatus({ kind: "error", text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const err = (path: string) => errors[path];

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5 md:gap-6">
      <div className="grid gap-5 md:gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        {/* Side column first in the DOM so phones see status and organisation near the top */}
        <div className="flex flex-col gap-5 md:gap-6 xl:sticky xl:top-8 xl:order-2">
          <Panel title="Status">
            <Field label="Status" id="p-status" hint="Only active products are shown in the store.">
              <Select
                id="p-status"
                value={draft.status}
                onChange={(e) => set("status", e.target.value as Draft["status"])}
              >
                {PRODUCT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </option>
                ))}
              </Select>
            </Field>
            <Toggle
              id="p-featured"
              label="Featured"
              description="Shown in featured spots on the home page"
              checked={draft.isFeatured}
              onChange={(v) => set("isFeatured", v)}
            />
          </Panel>

          <Panel title="Organisation">
            <Field label="Category" id="p-category" error={err("categoryId")}>
              <Select id="p-category" value={draft.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                <option value="">No category</option>
                {options.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parentId ? `— ${c.name}` : c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Brand" id="p-brand" error={err("brandId")}>
              <Select id="p-brand" value={draft.brandId} onChange={(e) => set("brandId", e.target.value)}>
                <option value="">No brand</option>
                {options.brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tags" id="p-tags" hint="Comma separated. Used by search." error={err("tags")}>
              <TextInput
                id="p-tags"
                value={draft.tags}
                onChange={(e) => set("tags", e.target.value)}
                placeholder="rgb, wifi, alexa"
                hasHint
              />
            </Field>
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-5 md:gap-6">
          <Panel title="Details">
            <Field label="Name" id="p-name" error={err("name")}>
              <TextInput
                id="p-name"
                value={draft.name}
                error={err("name")}
                onChange={(e) => {
                  const name = e.target.value;
                  setDraft((d) => ({ ...d, name, slug: d.slugTouched ? d.slug : slugify(name) }));
                }}
              />
            </Field>
            <Field
              label="URL slug"
              id="p-slug"
              error={err("slug")}
              hint={<>Page address: /product/{draft.slug || "…"}/</>}
            >
              <TextInput
                id="p-slug"
                value={draft.slug}
                error={err("slug")}
                hasHint
                autoCapitalize="none"
                spellCheck={false}
                onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value, slugTouched: true }))}
              />
            </Field>
            <Field label="Subtitle" id="p-subtitle" hint="One line under the title on the product page" error={err("subtitle")}>
              <TextInput id="p-subtitle" value={draft.subtitle} hasHint onChange={(e) => set("subtitle", e.target.value)} />
            </Field>
            <Field label="Short description" id="p-short" error={err("shortDescription")}>
              <TextArea
                id="p-short"
                className="min-h-20"
                value={draft.shortDescription}
                onChange={(e) => set("shortDescription", e.target.value)}
              />
            </Field>
            <Field label="Description" id="p-description" error={err("description")}>
              <TextArea
                id="p-description"
                className="min-h-40"
                value={draft.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
          </Panel>

          {children}

          <Panel
            title="Variants"
            description="Every product needs at least one. Attributes (Color, Size…) tell the variants apart."
          >
            {err("variants") && (
              <p role="alert" className="text-sm text-danger">
                {err("variants")}
              </p>
            )}
            <datalist id="attribute-names">
              {attributeNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <ul className="flex flex-col gap-4">
              {draft.variants.map((v, i) => {
                const vErr = (field: string) => err(`variants.${i}.${field}`);
                const idp = `v-${v.key}`;
                return (
                  <li key={v.key} className="flex flex-col gap-4 rounded-tile border border-line-strong p-3.5 md:p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-ink-500">Variant {i + 1}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setVariant(v.key, { isDefault: true })}
                          aria-pressed={v.isDefault}
                          className={cn(
                            "inline-flex h-11 items-center gap-1.5 rounded-control px-3 text-sm font-semibold",
                            v.isDefault ? "bg-brand-50 text-brand-800" : "text-ink-700 active:bg-brand-50",
                          )}
                        >
                          <Star
                            size={18}
                            strokeWidth={ICON_STROKE}
                            className={v.isDefault ? "fill-current" : undefined}
                            aria-hidden="true"
                          />
                          {v.isDefault ? "Default" : "Make default"}
                        </button>
                        {draft.variants.length > 1 && (
                          <button
                            type="button"
                            aria-label={`Remove variant ${i + 1}`}
                            onClick={() =>
                              setDraft((d) => ({
                                ...d,
                                variants: d.variants.filter((x) => x.key !== v.key),
                                tiers: d.tiers.filter((t) => t.variantKey !== v.key),
                              }))
                            }
                            className="inline-flex size-11 items-center justify-center rounded-control text-ink-500 active:bg-brand-50"
                          >
                            <Trash2 size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Name" id={`${idp}-name`} error={vErr("name")}>
                        <TextInput
                          id={`${idp}-name`}
                          value={v.name}
                          error={vErr("name")}
                          onChange={(e) => setVariant(v.key, { name: e.target.value })}
                          placeholder="Warm White / 5m"
                        />
                      </Field>
                      <Field label="SKU" id={`${idp}-sku`} error={vErr("sku")}>
                        <TextInput
                          id={`${idp}-sku`}
                          value={v.sku}
                          error={vErr("sku")}
                          autoCapitalize="characters"
                          spellCheck={false}
                          onChange={(e) => setVariant(v.key, { sku: e.target.value })}
                        />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      <Field label="Price ৳" id={`${idp}-price`} error={vErr("price")}>
                        <TextInput
                          id={`${idp}-price`}
                          inputMode="numeric"
                          value={v.price}
                          error={vErr("price")}
                          className="tabular-nums"
                          onChange={(e) => setVariant(v.key, { price: e.target.value.replace(/\D/g, "") })}
                        />
                      </Field>
                      <Field label="Compare at ৳" id={`${idp}-compare`} error={vErr("comparePrice")}>
                        <TextInput
                          id={`${idp}-compare`}
                          inputMode="numeric"
                          value={v.comparePrice}
                          error={vErr("comparePrice")}
                          className="tabular-nums"
                          placeholder="Optional"
                          onChange={(e) => setVariant(v.key, { comparePrice: e.target.value.replace(/\D/g, "") })}
                        />
                      </Field>
                      <Field label="Stock" id={`${idp}-stock`} error={vErr("stock")} className="col-span-2 md:col-span-1">
                        <TextInput
                          id={`${idp}-stock`}
                          inputMode="numeric"
                          value={v.stock}
                          error={vErr("stock")}
                          className="tabular-nums"
                          onChange={(e) => setVariant(v.key, { stock: e.target.value.replace(/\D/g, "") })}
                        />
                      </Field>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-semibold text-ink-700">Attributes</span>
                      {v.attributes.map((a, ai) => (
                        <div key={a.key} className="flex items-start gap-2">
                          <TextInput
                            aria-label="Attribute"
                            list="attribute-names"
                            value={a.attribute}
                            placeholder="Color"
                            error={err(`variants.${i}.attributes.${ai}.attribute`)}
                            onChange={(e) =>
                              setVariant(v.key, {
                                attributes: v.attributes.map((x) =>
                                  x.key === a.key ? { ...x, attribute: e.target.value } : x,
                                ),
                              })
                            }
                          />
                          <TextInput
                            aria-label={`${a.attribute || "Attribute"} value`}
                            list={`values-${a.key}`}
                            value={a.value}
                            placeholder="Warm White"
                            error={err(`variants.${i}.attributes.${ai}.value`)}
                            onChange={(e) =>
                              setVariant(v.key, {
                                attributes: v.attributes.map((x) =>
                                  x.key === a.key ? { ...x, value: e.target.value } : x,
                                ),
                              })
                            }
                          />
                          <datalist id={`values-${a.key}`}>
                            {valuesFor(a.attribute).map((val) => (
                              <option key={val} value={val} />
                            ))}
                          </datalist>
                          <button
                            type="button"
                            aria-label="Remove attribute"
                            onClick={() =>
                              setVariant(v.key, { attributes: v.attributes.filter((x) => x.key !== a.key) })
                            }
                            className="inline-flex size-12 shrink-0 items-center justify-center rounded-btn text-ink-500 active:bg-brand-50"
                          >
                            <X size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                      {v.attributes.length < 5 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="self-start"
                          onClick={() =>
                            setVariant(v.key, {
                              attributes: [...v.attributes, { key: uuid(), attribute: "", value: "" }],
                            })
                          }
                        >
                          <Plus size={18} strokeWidth={ICON_STROKE} aria-hidden="true" />
                          Add attribute
                        </Button>
                      )}
                    </div>

                    <Toggle
                      id={`${idp}-active`}
                      label="Available"
                      description="Hidden variants can't be ordered"
                      checked={v.isActive}
                      onChange={(isActive) => setVariant(v.key, { isActive })}
                    />
                  </li>
                );
              })}
            </ul>
            <Button
              variant="outline"
              className="self-start"
              onClick={() => setDraft((d) => ({ ...d, variants: [...d.variants, { ...emptyVariant(), name: "" }] }))}
            >
              <Plus size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
              Add variant
            </Button>
          </Panel>

          <Panel
            title="Bulk pricing"
            description="Buy this many or more and each piece costs less. Shown as tiers on the product page."
          >
            {draft.tiers.length > 0 && (
              <ul className="flex flex-col gap-3">
                {draft.tiers.map((t, i) => {
                  const tErr = (field: string) => err(`bulkTiers.${i}.${field}`);
                  const idp = `t-${t.key}`;
                  return (
                    <li key={t.key} className="grid grid-cols-2 gap-3 rounded-tile border border-line-strong p-3.5 md:p-4">
                      <Field label="Applies to" id={`${idp}-variant`}>
                        <Select
                          id={`${idp}-variant`}
                          value={t.variantKey}
                          onChange={(e) => setTier(t.key, { variantKey: e.target.value })}
                        >
                          <option value={ALL_VARIANTS}>All variants</option>
                          {draft.variants.map((v, vi) => (
                            <option key={v.key} value={v.key}>
                              {v.name || `Variant ${vi + 1}`}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Min qty" id={`${idp}-qty`} error={tErr("minQty")}>
                        <TextInput
                          id={`${idp}-qty`}
                          inputMode="numeric"
                          value={t.minQty}
                          error={tErr("minQty")}
                          onChange={(e) => setTier(t.key, { minQty: e.target.value.replace(/\D/g, "") })}
                        />
                      </Field>
                      <Field label="Price each ৳" id={`${idp}-price`} error={tErr("unitPrice")}>
                        <TextInput
                          id={`${idp}-price`}
                          inputMode="numeric"
                          value={t.unitPrice}
                          error={tErr("unitPrice")}
                          onChange={(e) => setTier(t.key, { unitPrice: e.target.value.replace(/\D/g, "") })}
                        />
                      </Field>
                      <Field label="Label" id={`${idp}-label`} error={tErr("label")}>
                        <TextInput
                          id={`${idp}-label`}
                          value={t.label}
                          placeholder="Most popular"
                          onChange={(e) => setTier(t.key, { label: e.target.value })}
                        />
                      </Field>
                      <Button
                        variant="ghost"
                        className="col-span-2 justify-self-start text-danger active:bg-danger/10"
                        onClick={() => setDraft((d) => ({ ...d, tiers: d.tiers.filter((x) => x.key !== t.key) }))}
                      >
                        <Trash2 size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
                        Remove tier
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
            {draft.tiers.length < 10 && (
              <Button
                variant="outline"
                className="self-start"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    tiers: [...d.tiers, { key: uuid(), variantKey: ALL_VARIANTS, minQty: "", unitPrice: "", label: "" }],
                  }))
                }
              >
                <Plus size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
                Add tier
              </Button>
            )}
          </Panel>

          <Panel title="Specifications" description="Shown as a table on the product page.">
            {draft.specs.length > 0 && (
              <ul className="flex flex-col gap-2">
                {draft.specs.map((s, i) => (
                  <li key={s.key} className="flex items-start gap-2">
                    <TextInput
                      aria-label="Specification"
                      value={s.label}
                      placeholder="Battery"
                      error={err(`specs.${i}.label`)}
                      onChange={(e) => setSpec(s.key, { label: e.target.value })}
                      className="w-2/5"
                    />
                    <TextInput
                      aria-label={`${s.label || "Specification"} value`}
                      value={s.value}
                      placeholder="2000 mAh"
                      error={err(`specs.${i}.value`)}
                      onChange={(e) => setSpec(s.key, { value: e.target.value })}
                    />
                    <button
                      type="button"
                      aria-label="Remove specification"
                      onClick={() => setDraft((d) => ({ ...d, specs: d.specs.filter((x) => x.key !== s.key) }))}
                      className="inline-flex size-12 shrink-0 items-center justify-center rounded-btn text-ink-500 active:bg-brand-50"
                    >
                      <X size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Button
              variant="outline"
              className="self-start"
              onClick={() => setDraft((d) => ({ ...d, specs: [...d.specs, { key: uuid(), label: "", value: "" }] }))}
            >
              <Plus size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
              Add specification
            </Button>
          </Panel>

          <Panel title="Search engine listing" description="Leave empty to use the product name and short description.">
            <div className="flex flex-col gap-1 rounded-tile bg-surface-sunken p-3.5">
              <span className="truncate text-caption text-success-ink">primegearbd.com/product/{draft.slug || "…"}/</span>
              <span className="line-clamp-1 text-lead font-semibold text-brand-800">
                {draft.seoTitle || draft.name || "Product title"}
              </span>
              <span className="line-clamp-2 text-sm text-ink-700">
                {draft.seoDescription || draft.shortDescription || "Description shown in Google results."}
              </span>
            </div>
            <Field label="SEO title" id="p-seo-title" error={err("seoTitle")} aside={<Counter value={draft.seoTitle} max={70} />}>
              <TextInput id="p-seo-title" value={draft.seoTitle} error={err("seoTitle")} onChange={(e) => set("seoTitle", e.target.value)} />
            </Field>
            <Field
              label="SEO description"
              id="p-seo-description"
              error={err("seoDescription")}
              aside={<Counter value={draft.seoDescription} max={160} />}
            >
              <TextArea
                id="p-seo-description"
                className="min-h-24"
                value={draft.seoDescription}
                error={err("seoDescription")}
                onChange={(e) => set("seoDescription", e.target.value)}
              />
            </Field>
          </Panel>
        </div>
      </div>

      {/* Save bar: pinned above the bottom tabs on phones, at the bottom of the column from md */}
      <div className="sticky bottom-[calc(80px+env(safe-area-inset-bottom))] z-20 flex items-center gap-3 rounded-panel bg-white p-3 shadow-card-lift md:bottom-4">
        <p
          role="status"
          aria-live="polite"
          className={cn(
            "min-w-0 flex-1 text-sm",
            shownStatus?.kind === "error" && "font-semibold text-danger",
            shownStatus?.kind === "ok" && "font-semibold text-success-ink",
            !shownStatus && "text-ink-500",
          )}
        >
          {shownStatus?.text ?? (dirty ? "Unsaved changes" : product ? "All changes saved" : "New product")}
        </p>
        {product && (
          <Button variant="ghost" onClick={() => setConfirmDelete(true)} className="text-danger active:bg-danger/10">
            <Trash2 size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
            <span className="max-md:sr-only">Delete</span>
          </Button>
        )}
        <Button type="submit" disabled={busy || (!dirty && !!product)} className="min-w-32">
          {busy && <LoaderCircle size={20} className="motion-safe:animate-spin" aria-hidden="true" />}
          {product ? "Save" : "Create product"}
        </Button>
      </div>

      {product && (
        <ConfirmSheet
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          title="Delete product?"
          message={`"${product.name}" and its images will be removed. Past orders keep their details. To hide it from the store instead, set its status to Archived.`}
          onConfirm={async () => {
            await adminApi.deleteProduct(product.id);
            setSaved(JSON.stringify(toInput(draft)));
            router.replace("/admin/products/");
            router.refresh();
          }}
        />
      )}
    </form>
  );
}
