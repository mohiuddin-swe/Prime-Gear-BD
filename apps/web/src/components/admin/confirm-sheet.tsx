"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@primegear/ui/button";
import { BottomSheet } from "@primegear/ui/overlay";

/** Destructive-action confirmation in a bottom sheet (a centred card from md up). */
export function ConfirmSheet({
  open,
  onClose,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  /** Throw to keep the sheet open; the message is shown */
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={busy} className="bg-none bg-danger shadow-none">
            {busy && <LoaderCircle size={20} className="motion-safe:animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-base text-ink-700">{message}</p>
      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </BottomSheet>
  );
}
