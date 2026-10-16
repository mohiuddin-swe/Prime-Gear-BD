import type { ProductFeature } from "@primegear/shared";
import { ICON_STROKE } from "@primegear/ui/icon";
import { GlowTile, SectionDark } from "@primegear/ui/section-dark";
import { featureIcons } from "@/lib/feature-icons";

/** "Why people love it": up to 4 dark glowing feature tiles. Renders nothing without features. */
export function FeatureCards({ features }: { features: ProductFeature[] }) {
  if (features.length === 0) return null;
  return (
    <SectionDark
      card
      glow="cyan"
      className="mx-4 mt-4 md:mx-0 md:mt-0"
      contentClassName="flex flex-col gap-3.5 px-4 py-4.5 md:p-6"
    >
      <h2 className="font-heading text-lg font-bold text-white">Why people love it</h2>
      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {features.map((f) => {
          const Icon = featureIcons[f.icon];
          return (
            <GlowTile
              key={f.title}
              title={f.title}
              icon={<Icon size={24} strokeWidth={ICON_STROKE} aria-hidden="true" />}
            >
              {f.text}
            </GlowTile>
          );
        })}
      </div>
    </SectionDark>
  );
}
