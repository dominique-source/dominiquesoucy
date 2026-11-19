import { headers } from "next/headers";
import Link from "next/link";
import { dict } from "@/lib/i18n";
export default async function NotFound() {
  const lang = (await headers()).get("x-site-locale") === "en" ? "en" : "fr";
  const d = dict(lang);
  return (
    <main className="content-shell fallback-page">
      <p className="eyebrow accent">404 / DOMINIQUE SOUCY</p>
      <h1>{d.notFound}</h1>
      <p>{d.unavailable}</p>
      <Link className="button" href={`/${lang}`}>
        {d.home}
      </Link>
    </main>
  );
}
