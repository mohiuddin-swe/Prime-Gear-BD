import { ButtonLink } from "@primegear/ui";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-4 px-4 py-16">
      <h1 className="font-heading text-3xl font-extrabold">Page not found</h1>
      <p className="text-base">We couldn&apos;t find what you were looking for.</p>
      <ButtonLink href="/">Back to home</ButtonLink>
    </div>
  );
}
