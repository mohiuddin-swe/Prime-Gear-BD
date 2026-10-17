"use client";

import { useState } from "react";
import { Button } from "@primegear/ui/button";
import { BottomSheet, Drawer } from "@primegear/ui/overlay";
import { QuickAddButton } from "@primegear/ui/product-card";

export function OverlayDemo() {
  const [sheet, setSheet] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [added, setAdded] = useState(0);
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={() => setSheet(true)}>
          Open bottom sheet
        </Button>
        <Button variant="outline" onClick={() => setDrawer(true)}>
          Open cart drawer
        </Button>
        <QuickAddButton onClick={() => setAdded((n) => n + 1)} />
        <span className="text-base">Quick adds: {added}</span>
      </div>
      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Filters">
        <p className="mb-4 text-base">Filters live in a bottom sheet on mobile.</p>
        <Button className="w-full" onClick={() => setSheet(false)}>
          Show results
        </Button>
      </BottomSheet>
      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Your cart">
        <p className="text-base">Your cart is empty.</p>
      </Drawer>
    </>
  );
}
