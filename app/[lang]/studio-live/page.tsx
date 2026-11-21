import type { Metadata } from "next";
import { locale } from "@/lib/i18n";
import { session } from "@/lib/studio/auth";
import { StudioGate } from "@/components/studio/gate";
import { StudioDashboard } from "@/components/studio/dashboard";
export const metadata: Metadata = {
  title: "Studio live",
  robots: { index: false, follow: false, nocache: true },
};
export const dynamic = "force-dynamic";
export default async function Studio({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const lang = locale((await params).lang);
  let s = null;
  try {
    s = await session();
  } catch {
    /* fail closed */
  }
  if (!s) return <StudioGate lang={lang} />;
  return (
    <StudioDashboard
      lang={lang}
      provider={!!process.env.OPENAI_API_KEY}
      expires={s.expires}
    />
  );
}
