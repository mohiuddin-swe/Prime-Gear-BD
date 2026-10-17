"use client";

import Image from "next/image";
import { useRef, useState, type DragEvent, type KeyboardEvent, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight, GripVertical, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import {
  UPLOAD_CONTENT_TYPES,
  UPLOAD_MAX_BYTES,
  type AdminProduct,
  type AdminProductImage,
} from "@primegear/shared";
import { cn } from "@primegear/ui/cn";
import { ICON_STROKE } from "@primegear/ui/icon";
import { adminApi, errorMessage, uploadFile } from "@/lib/admin-api";
import { uuid } from "@/lib/utils";
import { ConfirmSheet } from "./confirm-sheet";
import { Panel, controlCls } from "./ui";

type Pending = { key: string; name: string; progress: number; error?: string };

const ACCEPT = UPLOAD_CONTENT_TYPES.join(",");
const MAX_MB = UPLOAD_MAX_BYTES / 1024 / 1024;

const move = <T,>(list: T[], from: number, to: number) => {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
};

/** Alt text from the file name until someone writes a better one: "warm-white_lamp.jpg" -> "warm white lamp" */
const altFromName = (name: string) =>
  name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .slice(0, 200);

/**
 * Product images, saved as you go (not with the product form). Upload: presign → PUT straight to
 * storage → attach. Order: drag the handle (mouse or touch) or use the arrow buttons; first = main image.
 */
export function ImageManager({
  productId,
  initialImages,
  variants,
}: {
  productId: string;
  initialImages: AdminProductImage[];
  variants: AdminProduct["variants"];
}) {
  const [images, setImages] = useState(initialImages);
  const [pending, setPending] = useState<Pending[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AdminProductImage | null>(null);
  const drag = useRef<{ id: string; before: AdminProductImage[]; order: AdminProductImage[] } | null>(null);

  const persistOrder = async (next: AdminProductImage[], before: AdminProductImage[]) => {
    if (next.map((i) => i.id).join() === before.map((i) => i.id).join()) return;
    setError(null);
    try {
      setImages(await adminApi.reorderImages(productId, next.map((i) => i.id)));
    } catch (err) {
      setImages(before);
      setError(errorMessage(err));
    }
  };

  const upload = async (files: FileList | File[]) => {
    setError(null);
    for (const file of Array.from(files)) {
      const key = uuid();
      const problem = !(UPLOAD_CONTENT_TYPES as readonly string[]).includes(file.type)
        ? "Use JPG, PNG, WebP or AVIF"
        : file.size > UPLOAD_MAX_BYTES
          ? `Larger than ${MAX_MB} MB`
          : undefined;
      setPending((p) => [...p, { key, name: file.name, progress: 0, error: problem }]);
      if (problem) continue;
      try {
        const { key: objectKey } = await uploadFile(file, "products", (progress) =>
          setPending((p) => p.map((x) => (x.key === key ? { ...x, progress } : x))),
        );
        const image = await adminApi.addImage(productId, { key: objectKey, alt: altFromName(file.name) });
        setImages((list) => [...list, image]);
        setPending((p) => p.filter((x) => x.key !== key));
      } catch (err) {
        setPending((p) => p.map((x) => (x.key === key ? { ...x, error: errorMessage(err) } : x)));
      }
    }
  };

  const update = async (image: AdminProductImage, patch: Parameters<typeof adminApi.updateImage>[2]) => {
    setError(null);
    const before = images;
    setImages((list) => list.map((i) => (i.id === image.id ? ({ ...i, ...patch } as AdminProductImage) : i)));
    try {
      const saved = await adminApi.updateImage(productId, image.id, patch);
      setImages((list) => list.map((i) => (i.id === saved.id ? saved : i)));
    } catch (err) {
      setImages(before);
      setError(errorMessage(err));
    }
  };

  // Pointer-based dragging works for mouse, pen and touch (HTML5 drag-and-drop doesn't on phones).
  // Move/up listen on window: reordering moves the tile's DOM node, which drops pointer capture.
  const onPointerDown = (e: PointerEvent<HTMLButtonElement>, id: string) => {
    if (e.button !== 0 || drag.current) return;
    e.preventDefault();
    const d = { id, before: images, order: images };
    drag.current = d;
    setDraggingId(id);

    const onMove = (ev: globalThis.PointerEvent) => {
      const over = document
        .elementFromPoint(ev.clientX, ev.clientY)
        ?.closest<HTMLElement>("[data-image-id]")?.dataset.imageId;
      if (!over || over === d.id) return;
      const from = d.order.findIndex((i) => i.id === d.id);
      const to = d.order.findIndex((i) => i.id === over);
      if (from === -1 || to === -1) return;
      d.order = move(d.order, from, to);
      setImages(d.order);
    };
    const onEnd = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      drag.current = null;
      setDraggingId(null);
      void persistOrder(d.order, d.before);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDropActive(false);
    if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
  };

  // Enter in the alt field saves it instead of submitting the product form around it
  const blurOnEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  return (
    <Panel
      title="Images"
      description="Square photos on a light background look best. The first image is the main one. Changes save right away."
    >
      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {images.map((image, index) => (
            <li
              key={image.id}
              data-image-id={image.id}
              className={cn(
                "flex flex-col overflow-hidden rounded-tile border border-line-strong bg-white transition",
                draggingId === image.id && "border-brand-600 shadow-selected motion-safe:scale-[1.02]",
              )}
            >
              <div className="relative aspect-square bg-surface-sunken">
                <Image
                  src={image.url}
                  alt={image.alt ?? ""}
                  fill
                  sizes="(min-width: 1280px) 220px, (min-width: 768px) 30vw, 50vw"
                  className="pointer-events-none object-contain"
                  draggable={false}
                />
                {index === 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-brand-gradient px-2 py-0.5 text-2xs font-semibold text-white">
                    Main
                  </span>
                )}
                {image.kind === "DARK_ROOM" && (
                  <span className="absolute bottom-2 left-2 rounded-full bg-ink-950 px-2 py-0.5 text-2xs font-semibold text-glow">
                    Dark room
                  </span>
                )}
                <button
                  type="button"
                  aria-label={`Drag to reorder image ${index + 1}`}
                  onPointerDown={(e) => onPointerDown(e, image.id)}
                  className="absolute right-1 top-1 inline-flex size-11 touch-none cursor-grab items-center justify-center rounded-control bg-white/90 text-ink-700 shadow-card-soft active:cursor-grabbing"
                >
                  <GripVertical size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
                </button>
              </div>
              <div className="flex flex-col gap-2 p-2.5">
                <input
                  aria-label={`Alt text for image ${index + 1}`}
                  defaultValue={image.alt ?? ""}
                  placeholder="Describe the photo"
                  maxLength={200}
                  onKeyDown={blurOnEnter}
                  onBlur={(e) => {
                    const alt = e.target.value.trim();
                    if (alt !== (image.alt ?? "")) void update(image, { alt });
                  }}
                  className={cn(controlCls, "h-11 px-3 text-base")}
                />
                <select
                  aria-label={`Type of image ${index + 1}`}
                  value={image.kind}
                  onChange={(e) => update(image, { kind: e.target.value as AdminProductImage["kind"] })}
                  className={cn(controlCls, "h-11 px-2.5")}
                >
                  <option value="STANDARD">Photo</option>
                  <option value="DARK_ROOM">Dark room</option>
                </select>
                {variants.length > 1 && (
                  <select
                    aria-label={`Variant shown in image ${index + 1}`}
                    value={image.variantId ?? ""}
                    onChange={(e) => update(image, { variantId: e.target.value || null })}
                    className={cn(controlCls, "h-11 px-2.5")}
                  >
                    <option value="">All variants</option>
                    {variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex">
                    <button
                      type="button"
                      aria-label={`Move image ${index + 1} earlier`}
                      disabled={index === 0}
                      onClick={() => persistOrder(move(images, index, index - 1), images)}
                      className="inline-flex size-11 items-center justify-center rounded-control text-ink-700 active:bg-brand-50 disabled:opacity-30"
                    >
                      <ChevronLeft size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move image ${index + 1} later`}
                      disabled={index === images.length - 1}
                      onClick={() => persistOrder(move(images, index, index + 1), images)}
                      className="inline-flex size-11 items-center justify-center rounded-control text-ink-700 active:bg-brand-50 disabled:opacity-30"
                    >
                      <ChevronRight size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
                    </button>
                  </div>
                  <button
                    type="button"
                    aria-label={`Delete image ${index + 1}`}
                    onClick={() => setToDelete(image)}
                    className="inline-flex size-11 items-center justify-center rounded-control text-danger active:bg-danger/10"
                  >
                    <Trash2 size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pending.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Uploads">
          {pending.map((p) => (
            <li key={p.key} className="flex items-center gap-3 rounded-tile bg-surface-sunken px-3.5 py-2.5">
              {!p.error && <LoaderCircle size={20} className="shrink-0 text-brand-600 motion-safe:animate-spin" aria-hidden="true" />}
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-sm font-semibold">{p.name}</span>
                {p.error ? (
                  <span role="alert" className="text-caption text-danger">
                    {p.error}
                  </span>
                ) : (
                  <span className="h-1.5 overflow-hidden rounded-full bg-brand-100">
                    <span
                      className="block h-full rounded-full bg-brand-600 transition-[width]"
                      style={{ width: `${Math.round(p.progress * 100)}%` }}
                    />
                  </span>
                )}
              </span>
              {p.error && (
                <button
                  type="button"
                  onClick={() => setPending((list) => list.filter((x) => x.key !== p.key))}
                  className="inline-flex h-11 items-center px-2 text-sm font-semibold text-brand-600"
                >
                  Dismiss
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDropActive(true);
        }}
        onDragLeave={() => setDropActive(false)}
        onDrop={onDrop}
        className={cn(
          "flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-tile border-2 border-dashed px-4 py-5 text-center transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-600",
          dropActive ? "border-brand-600 bg-brand-50" : "border-line-strong bg-surface active:bg-brand-50",
        )}
      >
        <ImagePlus size={24} strokeWidth={ICON_STROKE} className="text-brand-600" aria-hidden="true" />
        <span className="text-copy font-semibold text-brand-600">Add images</span>
        <span className="text-caption text-ink-500">
          JPG, PNG, WebP or AVIF up to {MAX_MB} MB<span className="max-md:hidden"> · or drop files here</span>
        </span>
        <input
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) void upload(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      <ConfirmSheet
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        title="Delete image?"
        message="The image is removed from the product and from storage."
        onConfirm={async () => {
          if (!toDelete) return;
          await adminApi.deleteImage(productId, toDelete.id);
          setImages((list) => list.filter((i) => i.id !== toDelete.id));
        }}
      />
    </Panel>
  );
}
