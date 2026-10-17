"use client";

import Image from "next/image";
import { useState } from "react";
import { ImagePlus, LoaderCircle } from "lucide-react";
import { UPLOAD_CONTENT_TYPES, UPLOAD_MAX_BYTES, type PresignUploadInput } from "@primegear/shared";
import { cn } from "@primegear/ui/cn";
import { ICON_STROKE } from "@primegear/ui/icon";
import { errorMessage, uploadFile } from "@/lib/admin-api";

/**
 * One image (category picture, brand logo): uploads straight to storage and hands back its public
 * URL. The record keeps the URL once its form is saved; the API deletes the replaced file then.
 */
export function ImageField({
  id,
  label,
  value,
  onChange,
  folder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder: PresignUploadInput["folder"];
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!(UPLOAD_CONTENT_TYPES as readonly string[]).includes(file.type)) return setError("Use JPG, PNG, WebP or AVIF");
    if (file.size > UPLOAD_MAX_BYTES) return setError(`Larger than ${UPLOAD_MAX_BYTES / 1024 / 1024} MB`);
    setProgress(0);
    try {
      const { publicUrl } = await uploadFile(file, folder, setProgress);
      onChange(publicUrl);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-ink-700">{label}</span>
      <div className="flex items-center gap-3">
        <span className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-tile bg-surface-sunken text-ink-400">
          {value ? (
            <Image src={value} alt="" fill sizes="80px" className="object-contain" />
          ) : (
            <ImagePlus size={24} strokeWidth={ICON_STROKE} aria-hidden="true" />
          )}
          {progress !== null && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/80 text-sm font-semibold tabular-nums text-brand-800">
              {Math.round(progress * 100)}%
            </span>
          )}
        </span>
        <div className="flex flex-wrap gap-1">
          <label
            htmlFor={id}
            className={cn(
              "inline-flex h-11 cursor-pointer items-center gap-2 rounded-control px-3 text-sm font-semibold text-brand-600 focus-within:outline-2 focus-within:outline-brand-600 active:bg-brand-50",
              progress !== null && "pointer-events-none opacity-50",
            )}
          >
            {progress !== null && <LoaderCircle size={18} className="motion-safe:animate-spin" aria-hidden="true" />}
            {value ? "Replace" : "Upload"}
            <input
              id={id}
              type="file"
              accept={UPLOAD_CONTENT_TYPES.join(",")}
              className="sr-only"
              onChange={(e) => {
                void pick(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="inline-flex h-11 items-center rounded-control px-3 text-sm font-semibold text-ink-700 active:bg-brand-50"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
