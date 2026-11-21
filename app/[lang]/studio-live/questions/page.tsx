import type { Metadata } from "next";
import { locale } from "@/lib/i18n";
import { session } from "@/lib/studio/auth";
import { StudioGate } from "@/components/studio/gate";
import { PrivateQuestionConsole } from "@/components/questions/private-console";
export const metadata: Metadata = {
  title: "Questions — Studio",
  robots: { index: false, follow: false, nocache: true },
};
export const dynamic = "force-dynamic";
export default async function Console({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const lang = locale((await params).lang);
  let authorized = false;
  try {
    authorized = !!(await session());
  } catch {}
  return authorized ? (
    <PrivateQuestionConsole lang={lang} />
  ) : (
    <StudioGate lang={lang} />
  );
}
