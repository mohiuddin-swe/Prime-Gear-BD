"use client";

import { useState } from "react";
import type { LightMode } from "@primegear/shared";
import { SelectableCard, SelectableGroup } from "@primegear/ui/selectable-card";

/**
 * Light mode preview for lighting products: glowing swatches, the selected mode's description below.
 * Starts on the last mode (usually the warmest, the one the dark-room shots show).
 */
export function LightModes({ modes }: { modes: LightMode[] }) {
  const [selected, setSelected] = useState(modes.length - 1);
  if (modes.length === 0) return null;
  const current = modes[selected] ?? modes[0]!;

  return (
    <section
      aria-labelledby="light-modes"
      className="mx-4 mt-4 flex flex-col gap-3 rounded-panel bg-white p-4 shadow-card md:mx-0 md:mt-0 md:p-6"
    >
      <h2 id="light-modes" className="font-heading text-lg font-bold">
        {modes.length} light {modes.length === 1 ? "mode" : "modes"}
      </h2>
      <SelectableGroup label="Light mode preview" columns={modes.length === 2 ? 2 : 3}>
        {modes.map((m, i) => (
          <SelectableCard
            key={m.label}
            variant="swatch"
            selected={i === selected}
            onSelect={() => setSelected(i)}
            title={m.label}
            swatch={m.color}
          />
        ))}
      </SelectableGroup>
      {current.text && (
        <p aria-live="polite" className="text-sm leading-body text-ink-500">
          {current.text}
        </p>
      )}
    </section>
  );
}
