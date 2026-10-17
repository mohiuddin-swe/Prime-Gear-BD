"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, ImageOff, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { brandInputSchema, slugify, type AdminBrand } from "@primegear/shared";
import { Button } from "@primegear/ui/button";
import { ICON_STROKE } from "@primegear/ui/icon";
import { BottomSheet } from "@primegear/ui/overlay";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, errorMessage } from "@/lib/admin-api";
import { ConfirmSheet } from "./confirm-sheet";
import { ImageField } from "./image-field";
import { EmptyState, Field, TextInput } from "./ui";

function Logo({ url }: { url: string | null }) {
  return (
    <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-control bg-surface-sunken text-ink-400">
      {url ? (
        <Image src={url} alt="" fill sizes="48px" className="object-contain p-1" />
      ) : (
        <ImageOff size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
      )}
    </span>
  );
}

const productCount = (n: number) => `${n} ${n === 1 ? "product" : "products"}`;

/** Brand list (cards below xl, table from xl) with create / edit in a sheet. */
export function BrandManager({ brands, filtered }: { brands: AdminBrand[]; filtered: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ brand: AdminBrand | null } | null>(null);

  return (
    <>
      <Button onClick={() => setEditing({ brand: null })} className="w-full md:w-auto md:self-start">
        <Plus size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
        New brand
      </Button>

      {brands.length === 0 ? (
        <EmptyState title={filtered ? "No brands match" : "No brands yet"} />
      ) : (
        <>
          <ul className="grid gap-3 md:grid-cols-2 xl:hidden">
            {brands.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => setEditing({ brand: b })}
                  className="flex min-h-18 w-full items-center gap-3 rounded-card bg-white p-3 text-left shadow-card motion-safe:active:-translate-y-px"
                >
                  <Logo url={b.logoUrl} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-copy font-semibold text-ink-950">{b.name}</span>
                    <span className="text-caption text-ink-500">{productCount(b.productCount)}</span>
                  </span>
                  <ChevronRight size={20} strokeWidth={ICON_STROKE} className="text-ink-400" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <div className="hidden xl:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brand</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-right">Products</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brands.map((b) => (
                  <TableRow key={b.id} className="relative focus-within:bg-brand-50">
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => setEditing({ brand: b })}
                        className="flex items-center gap-3 text-left font-semibold text-ink-950 after:absolute after:inset-0 after:content-['']"
                      >
                        <Logo url={b.logoUrl} />
                        {b.name}
                      </button>
                    </TableCell>
                    <TableCell className="text-ink-500">{b.slug}</TableCell>
                    <TableCell className="text-right tabular-nums">{b.productCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {editing && (
        <BrandSheet
          brand={editing.brand}
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

function BrandSheet({
  brand,
  onClose,
  onDone,
}: {
  brand: AdminBrand | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(brand?.name ?? "");
  const [slug, setSlug] = useState(brand?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!brand);
  const [logoUrl, setLogoUrl] = useState(brand?.logoUrl ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async () => {
    setError(null);
    const body = { name, slug, logoUrl };
    const parsed = brandInputSchema.safeParse(body);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) next[String(i.path[0])] ??= i.message;
      return setErrors(next);
    }
    setErrors({});
    setBusy(true);
    try {
      await (brand ? adminApi.updateBrand(brand.id, body) : adminApi.createBrand(body));
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
      title={brand ? "Edit brand" : "New brand"}
      footer={
        <div className="flex flex-col gap-2">
          {error && (
            <p role="alert" className="text-sm font-semibold text-danger">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            {brand && (
              <Button variant="ghost" onClick={() => setConfirmDelete(true)} className="text-danger active:bg-danger/10">
                <Trash2 size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
                Delete
              </Button>
            )}
            <Button onClick={save} disabled={busy} className="flex-1">
              {busy && <LoaderCircle size={20} className="motion-safe:animate-spin" aria-hidden="true" />}
              {brand ? "Save" : "Create brand"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Name" id="b-name" error={errors.name}>
          <TextInput
            id="b-name"
            value={name}
            error={errors.name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
          />
        </Field>
        <Field label="Slug" id="b-slug" error={errors.slug}>
          <TextInput
            id="b-slug"
            value={slug}
            error={errors.slug}
            autoCapitalize="none"
            spellCheck={false}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
          />
        </Field>
        <ImageField id="b-logo" label="Logo" folder="brands" value={logoUrl} onChange={setLogoUrl} />
      </div>

      {brand && (
        <ConfirmSheet
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          title="Delete brand?"
          message={`${productCount(brand.productCount)} will have no brand. The products themselves stay.`}
          onConfirm={async () => {
            await adminApi.deleteBrand(brand.id);
            onDone();
          }}
        />
      )}
    </BottomSheet>
  );
}
