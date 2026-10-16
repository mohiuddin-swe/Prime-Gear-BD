"use client";

import { useEffect } from "react";

/** After a client-side navigation the page can land partly under the sticky header: start at the top. */
export function ScrollToTop() {
  // Braces on purpose: an effect must return nothing or a cleanup function, never the call's result
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return null;
}
