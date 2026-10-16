"use client";

import { useEffect } from "react";
import { captureAttribution } from "@/lib/tracking";

/** Mounted once in the layout: stores fbclid / ttclid from the landing URL. */
export function AttributionCapture() {
  useEffect(() => {
    captureAttribution();
  }, []);
  return null;
}
