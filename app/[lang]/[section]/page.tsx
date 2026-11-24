import { notFound } from "next/navigation";
import { locale, dict, sections, type Section } from "@/lib/i18n";
import { getEntries, matchesTopic, observationTopics } from "@/lib/content";
import { AboutImmersive } from "@/components/about-immersive";
import {
  VideoEditorial,
  FieldNotes,
  SubjectEditorial,
} from "@/components/editorial-templates";
import { pageMetadata } from "@/lib/metadata";
type Props = {
  params: Promise<{ lang: string; section: string }>;
  searchParams: Promise<{ category?: string }>;
};
function sectionName(value: string) {
  if (value !== "a-propos" && !sections.includes(value as Section)) notFound();
  return value as Section | "a-propos";
}
export async function generateMetadata({ params }: Props) {
  const p = await params;
  const lang = locale(p.lang);
  const section = sectionName(p.section);
  const d = dict(lang);
  return pageMetadata(
    lang,
    `/${section}`,
    d.nav[section],
    section === "a-propos" ? d.bio : d.descriptions[section],
  );
}
export default async function SectionPage({ params, searchParams }: Props) {
  const p = await params;
  const lang = locale(p.lang);
  const section = sectionName(p.section);
  if (section === "a-propos") return <AboutImmersive lang={lang} />;
  const { category } = await searchParams;
  const valid =
    section === "observations"
      ? observationTopics
      : ["sport", "societe", "humain"];
  if (category && !valid.some((value) => value === category)) notFound();
  const allEntries = getEntries(lang, section);
  const entries = category
    ? allEntries.filter((e) =>
        section === "observations"
          ? matchesTopic(e, category)
          : e.category === category,
      )
    : allEntries;
  if (section === "reflexions")
    return (
      <VideoEditorial
        lang={lang}
        entries={entries}
        allEntries={allEntries}
        active={category}
      />
    );
  if (section === "observations")
    return (
      <FieldNotes
        lang={lang}
        entries={entries}
        allEntries={allEntries}
        active={category}
      />
    );
  return (
    <SubjectEditorial
      lang={lang}
      section={section}
      entries={entries}
      allEntries={allEntries}
      active={category}
    />
  );
}
