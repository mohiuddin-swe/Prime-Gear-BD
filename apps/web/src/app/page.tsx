import { healthResponseSchema } from "@primegear/shared";

async function getApiStatus(): Promise<string> {
  try {
    const res = await fetch(`${process.env.API_URL ?? "http://localhost:4000"}/api/v1/health`, {
      cache: "no-store",
    });
    const parsed = healthResponseSchema.safeParse(await res.json());
    return parsed.success ? parsed.data.data.status : "invalid response";
  } catch {
    return "unreachable";
  }
}

export default async function Home() {
  const status = await getApiStatus();
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-xl flex-col justify-center gap-3 px-4">
      <h1 className="font-heading text-3xl font-extrabold">PRIME GEAR BD</h1>
      <p className="text-base">GEAR UP · LEVEL UP</p>
      <p className="text-base">
        API status: <strong>{status}</strong>
      </p>
    </main>
  );
}
