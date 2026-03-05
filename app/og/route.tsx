import { generateOgImage } from "@/lib/og-image";
import ogConfig from "@/og.config";

export const runtime = "edge";

export async function GET(req: Request) {
  const page = new URL(req.url).searchParams.get("page") ?? "home";
  const base = ogConfig[page] ?? ogConfig.home;

  // Pick a random variant if the page defines any
  const config = base.variants?.length
    ? { ...base, ...base.variants[Math.floor(Math.random() * base.variants.length)] }
    : base;

  return generateOgImage(config);
}
