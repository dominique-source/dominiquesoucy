import { notFound } from "next/navigation";
import { locale, dict, sections, type Section } from "@/lib/i18n";
import { getEntries } from "@/lib/content";
import { CategoryNavigation, ObservationGrid } from "@/components/editorial";
import { AboutPreview, PurInstinctBridge } from "@/components/site";
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
  const d = dict(lang);
  if (section === "a-propos")
    return (
      <div className="content-shell">
        <header className="page-heading">
          <p className="eyebrow accent">{d.eyebrow}</p>
          <h1>{d.about}</h1>
        </header>
        <AboutPreview lang={lang} full />
        <PurInstinctBridge lang={lang} />
      </div>
    );
  const { category } = await searchParams;
  if (category && !["sport", "societe", "humain"].includes(category))
    notFound();
  return (
    <div className="content-shell listing">
      <header className="page-heading">
        <p className="eyebrow accent">DOMINIQUE SOUCY / {d.eyebrow}</p>
        <h1>{d.nav[section]}</h1>
        <p>{d.descriptions[section]}</p>
        {section === "societe" && <p className="subjects">{d.subjects}</p>}
      </header>
      <CategoryNavigation lang={lang} section={section} active={category} />
      <ObservationGrid
        lang={lang}
        entries={getEntries(lang, section, category)}
      />
    </div>
  );
}
