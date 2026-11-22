import { notFound } from "next/navigation";
import { locale } from "@/lib/i18n";
import { QuestionsApp } from "@/components/questions/app";
export default async function QuestionPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id)) notFound();
  return <QuestionsApp lang={locale(lang)} questionId={id} />;
}
