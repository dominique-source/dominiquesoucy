"use client";
import Link from "next/link";
import { useLocale } from "@/components/locale-provider";
import { dict } from "@/lib/i18n";
export default function NotFound() {
  const lang = useLocale();
  const d = dict(lang);
  return (
    <div className="content-shell fallback-page">
      <p className="eyebrow accent">404 / DOMINIQUE SOUCY</p>
      <h1>{d.notFound}</h1>
      <p>{d.unavailable}</p>
      <Link className="button" href={`/${lang}`}>
        {d.home}
      </Link>
    </div>
  );
}
