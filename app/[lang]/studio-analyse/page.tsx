import type { Metadata } from "next";
import { locale } from "@/lib/i18n";
import { session } from "@/lib/studio/auth";
import { StudioGate } from "@/components/studio/gate";
import { ProductionStudio } from "@/components/analysis/production-studio";
import { freshProject } from "@/lib/analysis/project";
import "./analysis.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Studio d’analyse IA",
  robots: { index: false, follow: false, nocache: true },
};
export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const lang = locale((await params).lang);
  let authorized = false;
  try { authorized = !!(await session()); } catch { /* fail closed */ }
  if (!authorized) return <StudioGate lang={lang} />;
  return <ProductionStudio lang={lang} initialProject={freshProject(lang)} />;
}
