"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@primegear/ui/button";
import { ICON_STROKE } from "@primegear/ui/icon";
import { adminApi } from "@/lib/admin-api";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await adminApi.logout().catch(() => undefined);
        router.replace("/admin/login/");
        router.refresh();
      }}
    >
      <LogOut size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
      Sign out
    </Button>
  );
}
