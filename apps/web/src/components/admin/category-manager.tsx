"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, ImageOff, LoaderCircle, Plus, Trash2 } from "lucide-react";
import {
  categoryInputSchema,
  slugify,
  type AdminCatalogOptions,
  type AdminCategory,
  type CategoryInput,
} from "@primegear/shared";
import { Button } from "@primegear/ui/button";
import { ICON_STROKE } from "@primegear/ui/icon";
import { BottomSheet } from "@primegear/ui/overlay";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, errorMessage } from "@/lib/admin-api";
import { ConfirmSheet } from "./confirm-sheet";
import { ImageField } from "./image-field";
import { Counter, EmptyState, Field, Select, StatusBadge, TextArea, TextInput, Toggle } from "./ui";

type Draft = Required<{ [K in keyof CategoryInput]: NonNullable<CategoryInput[K]> }> & { sortOrder: number };

const toDraft = (c: AdminCategory | null): Draft => ({
  name: c?.name ?? "",
  slug: c?.slug ?? "",
  parentId: c?.parentId ?? "",
  description: c?.description ?? "",
  imageUrl: c?.imageUrl ?? "",
  sortOrder: c?.sortOrder ?? 0,
  isActive: c?.isActive ?? true,
  seoTitle: c?.seoTitle ?? "",
  seoDescription: c?.seoDescription ?? "",
});

function Thumb({ url }: { url: string | null }) {
  return (
    <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-control bg-surface-sunken text-ink-400">
      {url ? (
        <Image src={url} alt="" fill sizes="48px" className="object-contain" />
      ) : (
        <ImageOff size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
      )}
    </span>
  );
}

/** Category list (cards below xl, table from xl) with create / edit in a sheet. */
export function CategoryManager({
  categories,
  allCategories,
  filtered,
}: {
  categories: AdminCategory[];
  /** Every category, for the parent select */
  allCategories: AdminCatalogOptions["categories"];
  filtered: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ category: AdminCategory | null } | null>(null);

  return (
    <>
      <Button onClick={() => setEditing({ category: null })} className="w-full md:w-auto md:self-start">
        <Plus size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
        New category
      </Button>

      {categories.length === 0 ? (
        <EmptyState title={filtered ? "No categories match" : "No categories yet"} />
      ) : (
        <>
          <ul className="grid gap-3 md:grid-cols-2 xl:hidden">
            {categories.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setEditing({ category: c })}
                  className="flex min-h-18 w-full items-center gap-3 rounded-card bg-white p-3 text-left shadow-card motion-safe:active:-translate-y-px"
                >
                  <Thumb url={c.imageUrl} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-copy font-semibold text-ink-950">{c.name}</span>
                    <span className="truncate text-caption text-ink-500">
                      {c.parentName ? `In ${c.parentName} · ` : ""}
                      {c.productCount} {c.productCount === 1 ? "product" : "products"}
                    </span>
                  </span>
                  <StatusBadge status={c.isActive ? "ON" : "OFF"} />
                  <ChevronRight size={20} strokeWidth={ICON_STROKE} className="text-ink-400" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <div className="hidden xl:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead className="text-right">Products</TableHead>
                  <TableHead className="text-right">Order</TableHead>
                  <TableHead>Visibility</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((c) => (
                  <TableRow key={c.id} className="relative focus-within:bg-brand-50">
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => setEditing({ category: c })}
                        className="flex items-center gap-3 text-left font-semibold text-ink-950 after:absolute after:inset-0 after:content-['']"
                      >
                        <Thumb url={c.imageUrl} />
                        <span className="flex flex-col">
                          {c.name}
                          <span className="text-xs font-normal text-ink-500">/{c.slug}/</span>
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="text-ink-700">{c.parentName ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.productCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.sortOrder}</TableCell>
                    <TableCell>
                      <StatusBadge status={c.isActive ? "ON" : "OFF"} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {editing && (
        <CategorySheet
          category={editing.category}
          parents={allCategories.filter((p) => p.id !== editing.category?.id)}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function CategorySheet({
  category,
  parents,
  onClose,
  onDone,
}: {
  category: AdminCategory | null;
  parents: AdminCatalogOptions["categories"];
  onClose: () => void;
  onDone: () => void;
}) {
  const [draft, setDraft] = useState(() => toDraft(category));
  const [slugTouched, setSlugTouched] = useState(!!category);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    setError(null);
    const body: CategoryInput = { ...draft, parentId: draft.parentId || null };
    const parsed = categoryInputSchema.safeParse(body);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) next[String(i.path[0])] ??= i.message;
      return setErrors(next);
    }
    setErrors({});
    setBusy(true);
    try {
      await (category ? adminApi.updateCategory(category.id, body) : adminApi.createCategory(body));
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={category ? "Edit category" : "New category"}
      footer={
        <div className="flex flex-col gap-2">
          {error && (
            <p role="alert" className="text-sm font-semibold text-danger">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            {category && (
              <Button variant="ghost" onClick={() => setConfirmDelete(true)} className="text-danger active:bg-danger/10">
                <Trash2 size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
                Delete
              </Button>
            )}
            <Button onClick={save} disabled={busy} className="flex-1">
              {busy && <LoaderCircle size={20} className="motion-safe:animate-spin" aria-hidden="true" />}
              {category ? "Save" : "Create category"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Name" id="c-name" error={errors.name}>
          <TextInput
            id="c-name"
            value={draft.name}
            error={errors.name}
            onChange={(e) => {
              const name = e.target.value;
              setDraft((d) => ({ ...d, name, slug: slugTouched ? d.slug : slugify(name) }));
            }}
          />
        </Field>
        <Field label="URL slug" id="c-slug" error={errors.slug} hint={<>/product-category/{draft.slug || "…"}/</>}>
          <TextInput
            id="c-slug"
            value={draft.slug}
            error={errors.slug}
            hasHint
            autoCapitalize="none"
            spellCheck={false}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug", e.target.value);
            }}
          />
        </Field>
        <Field label="Parent category" id="c-parent" error={errors.parentId}>
          <Select id="c-parent" value={draft.parentId} onChange={(e) => set("parentId", e.target.value)}>
            <option value="">None (top level)</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.parentId ? `— ${p.name}` : p.name}
              </option>
            ))}
          </Select>
        </Field>
        <ImageField id="c-image" label="Image" folder="categories" value={draft.imageUrl} onChange={(v) => set("imageUrl", v)} />
        <Field label="Description" id="c-description" error={errors.description}>
          <TextArea id="c-description" value={draft.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <Field label="Sort order" id="c-sort" hint="Lower numbers come first" error={errors.sortOrder}>
          <TextInput
            id="c-sort"
            inputMode="numeric"
            value={String(draft.sortOrder)}
            hasHint
            onChange={(e) => set("sortOrder", Number(e.target.value.replace(/\D/g, "") || 0))}
          />
        </Field>
        <Toggle id="c-active" label="Visible in the store" checked={draft.isActive} onChange={(v) => set("isActive", v)} />
        <Field label="SEO title" id="c-seo-title" error={errors.seoTitle} aside={<Counter value={draft.seoTitle} max={70} />}>
          <TextInput id="c-seo-title" value={draft.seoTitle} error={errors.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
        </Field>
        <Field
          label="SEO description"
          id="c-seo-description"
          error={errors.seoDescription}
          aside={<Counter value={draft.seoDescription} max={160} />}
        >
          <TextArea
            id="c-seo-description"
            className="min-h-24"
            value={draft.seoDescription}
            error={errors.seoDescription}
            onChange={(e) => set("seoDescription", e.target.value)}
          />
        </Field>
      </div>

      {category && (
        <ConfirmSheet
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          title="Delete category?"
          message={`Its ${category.productCount} products become uncategorised and sub-categories move to the top level.`}
          onConfirm={async () => {
            await adminApi.deleteCategory(category.id);
            onDone();
          }}
        />
      )}
    </BottomSheet>
  );
}
