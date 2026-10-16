import Image from "next/image";
import { ButtonLink, SectionDark } from "@primegear/ui";

export function Hero({
  imageUrl,
  imageAlt,
  ctaHref,
}: {
  imageUrl: string | null;
  imageAlt: string;
  ctaHref: string;
}) {
  return (
    <SectionDark contentClassName="grid items-center gap-8 py-10 md:grid-cols-2 md:py-16">
      <div className="space-y-4">
        <p className="font-heading text-sm font-bold uppercase tracking-widest text-glow">
          Smart home · LED lighting
        </p>
        <h1 className="font-heading text-4xl font-extrabold leading-tight md:text-5xl">
          Light up your space. Gear up your life.
        </h1>
        <p className="max-w-md text-base text-slate-300">
          Genuine smart home, LED lighting and gadgets with cash on delivery across Bangladesh.
        </p>
        <ButtonLink href={ctaHref} className="w-full md:w-auto md:px-8">
          Shop now
        </ButtonLink>
      </div>
      <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-card bg-ink-950 shadow-glow ring-1 ring-white/10">
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            preload
            fetchPriority="high"
            sizes="(min-width: 768px) 448px, 100vw"
            className="object-cover"
          />
        )}
      </div>
    </SectionDark>
  );
}
