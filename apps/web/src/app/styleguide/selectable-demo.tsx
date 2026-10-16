"use client";

import { useState } from "react";
import { QuantityStepper, SelectableCard, SelectableGroup } from "@primegear/ui";
import { formatTaka } from "@primegear/shared/format";

const tiers = [
  { qty: 1, label: "1 piece", unit: 1490, save: "Regular price" },
  { qty: 2, label: "2 pieces", unit: 1371, save: "Save 8%", tag: "Most popular" },
  { qty: 3, label: "3 pieces", unit: 1311, save: "Save 12%" },
];
const modes = [
  { id: "cold", label: "Cold", swatch: "#dbeafe" },
  { id: "natural", label: "Natural", swatch: "#fef9e7" },
  { id: "warm", label: "Warm", swatch: "#ffd27a" },
];
const colours = [
  { id: "white", label: "White", swatch: "#ffffff" },
  { id: "black", label: "Black", swatch: "#1f2937" },
];
const areas = [
  { id: "inside", label: "Inside Dhaka", detail: "৳60 · 1–2 days" },
  { id: "outside", label: "Outside Dhaka", detail: "৳110 · 2–4 days" },
];
const payments = [
  { id: "cod", label: "Cash on delivery", sub: "Pay when you receive it", chip: { label: "COD", brand: "cod" } },
  { id: "bkash", label: "bKash", sub: "Pay now with bKash", chip: { label: "bKash", brand: "bkash" } },
  { id: "nagad", label: "Nagad", sub: "Pay now with Nagad", chip: { label: "Nagad", brand: "nagad" } },
  { id: "rocket", label: "Rocket", sub: "Pay now with Rocket", chip: { label: "Rocket", brand: "rocket" } },
] as const;
const filters = ["Rechargeable", "Motion sensor", "Under ৳1,000", "Warm white"];

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="font-heading text-lg font-bold">{title}</h3>
      {children}
    </div>
  );
}

export function SelectableDemo() {
  const [tier, setTier] = useState(2);
  const [mode, setMode] = useState("warm");
  const [colour, setColour] = useState("white");
  const [area, setArea] = useState("inside");
  const [pay, setPay] = useState("cod");
  const [on, setOn] = useState<string[]>(["Rechargeable"]);
  const [qty, setQty] = useState(2);

  return (
    <div className="space-y-8 md:max-w-2xl">
      <Block title="tier · Buy more, save more">
        <SelectableGroup label="Quantity offer" columns={3} className="pt-2.5">
          {tiers.map((t) => (
            <SelectableCard
              key={t.qty}
              variant="tier"
              selected={tier === t.qty}
              onSelect={() => setTier(t.qty)}
              title={t.label}
              value={`${formatTaka(t.unit)}${t.qty > 1 ? "/pc" : ""}`}
              detail={t.save}
              tag={t.tag}
            />
          ))}
        </SelectableGroup>
      </Block>

      <Block title="swatch · light modes">
        <SelectableGroup label="Light mode preview" columns={3}>
          {modes.map((m) => (
            <SelectableCard
              key={m.id}
              variant="swatch"
              selected={mode === m.id}
              onSelect={() => setMode(m.id)}
              title={m.label}
              swatch={m.swatch}
            />
          ))}
        </SelectableGroup>
      </Block>

      <Block title="chip · body colour">
        <SelectableGroup label="Body colour">
          {colours.map((c) => (
            <SelectableCard
              key={c.id}
              variant="chip"
              selected={colour === c.id}
              onSelect={() => setColour(c.id)}
              title={c.label}
              swatch={c.swatch}
            />
          ))}
        </SelectableGroup>
      </Block>

      <Block title="option · delivery area">
        <SelectableGroup label="Delivery area" columns={2}>
          {areas.map((a) => (
            <SelectableCard
              key={a.id}
              variant="option"
              selected={area === a.id}
              onSelect={() => setArea(a.id)}
              title={a.label}
              detail={a.detail}
            />
          ))}
        </SelectableGroup>
      </Block>

      <Block title="payment">
        <SelectableGroup label="Payment method" columns={1}>
          {payments.map((p) => (
            <SelectableCard
              key={p.id}
              variant="payment"
              selected={pay === p.id}
              onSelect={() => setPay(p.id)}
              title={p.label}
              detail={p.sub}
              chip={p.chip}
            />
          ))}
        </SelectableGroup>
      </Block>

      <Block title="pill · filter chips (toggle)">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map((f) => (
            <SelectableCard
              key={f}
              variant="pill"
              mode="toggle"
              selected={on.includes(f)}
              onSelect={() => setOn((c) => (c.includes(f) ? c.filter((x) => x !== f) : [...c, f]))}
              title={f}
            />
          ))}
        </div>
      </Block>

      <Block title="QuantityStepper">
        <div className="flex items-center gap-4">
          <QuantityStepper value={qty} onChange={setQty} label="Quantity of LED Wall Lamp" />
          <span className="text-base tabular-nums">Quantity: {qty} (1–10)</span>
        </div>
      </Block>
    </div>
  );
}
