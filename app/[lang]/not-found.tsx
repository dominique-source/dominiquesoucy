"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { dict } from "@/lib/i18n";
export default function NotFound() {
  const lang = usePathname().startsWith("/en") ? "en" : "fr";
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
