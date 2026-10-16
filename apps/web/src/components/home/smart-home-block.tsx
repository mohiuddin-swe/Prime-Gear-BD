import Link from "next/link";
import { Activity, BatteryCharging, Wifi } from "lucide-react";
import { buttonClasses, Eyebrow, GlowChip, ICON_STROKE, SectionDark } from "@primegear/ui";

const chip = { size: 16, strokeWidth: ICON_STROKE, "aria-hidden": true } as const;

/** Dark smart-home showcase with feature chips and a link into the category. */
export function SmartHomeBlock({ href }: { href: string }) {
  return (
    <SectionDark
      card
      glow="smart"
      className="mx-4 mt-6 md:mx-6 md:mt-10"
      contentClassName="flex flex-col gap-3.5 md:px-10 md:py-10"
    >
      <Eyebrow>Smart home</Eyebrow>
      <h2 className="font-heading text-2xl font-extrabold leading-display tracking-display text-white md:text-3xl">
        Make every room
        <br />a little smarter.
      </h2>
      <ul className="flex flex-wrap gap-2">
        <li>
          <GlowChip icon={<Activity {...chip} />}>Motion sensing</GlowChip>
        </li>
        <li>
          <GlowChip icon={<Wifi {...chip} />}>App control</GlowChip>
        </li>
        <li>
          <GlowChip icon={<BatteryCharging {...chip} />}>Rechargeable</GlowChip>
        </li>
      </ul>
      <Link href={href} className={buttonClasses("outline-dark", "self-start md:h-12")}>
        Explore smart home
      </Link>
    </SectionDark>
  );
}
