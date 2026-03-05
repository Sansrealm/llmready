import { generateOgImage } from "@/lib/og-image";
import ogConfig from "@/og.config";

export const runtime = "edge";

export async function GET(req: Request) {
  const page = new URL(req.url).searchParams.get("page") ?? "home";
  const config = ogConfig[page] ?? ogConfig.home;
  return generateOgImage(config);
}
