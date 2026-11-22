import type { Metadata } from "next";
import { locale } from "@/lib/i18n";
import { QuestionsApp } from "@/components/questions/app";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  return {
    title:
      locale((await params).lang) === "fr"
        ? "Boîte à questions"
        : "Question box",
  };
}
export default async function QuestionsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  return <QuestionsApp lang={locale((await params).lang)} />;
}
