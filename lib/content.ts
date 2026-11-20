import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { videoSource } from "./video";
import type { Locale, Section } from "./i18n";
const asset = z
  .string()
  .regex(/^\/assets\/(?!.*\.\.)[^?#]+$/, "Use a local approved /assets/ path");
export const contentSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().min(1),
    description: z.string().min(1),
    category: z.enum(["sport", "societe", "humain"]),
    contentType: z.enum(["reflection", "observation", "thought"]),
    publicationDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(
        (v) =>
          !Number.isNaN(Date.parse(v)) &&
          new Date(v).toISOString().slice(0, 10) === v,
        "Invalid calendar date",
      ),
    language: z.enum(["fr", "en"]),
    coverImage: asset.nullable(),
    coverAlt: z.string().optional(),
    videoUrl: z
      .string()
      .refine((v) => videoSource(v) !== null, "Unsupported video URL")
      .optional(),
    captions: asset.optional(),
    duration: z.string().optional(),
    tags: z.array(z.string()),
    topics: z
      .array(z.enum(["sport", "societe", "culture", "education", "communaute"]))
      .default([]),
    mediaAspect: z
      .enum(["landscape", "portrait", "square"])
      .default("landscape"),
    status: z.enum(["published", "draft"]),
    featured: z.boolean(),
    signature: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (v.coverImage && !v.coverAlt)
      ctx.addIssue({
        code: "custom",
        path: ["coverAlt"],
        message: "Approved images require alt text",
      });
  });
export type Entry = z.infer<typeof contentSchema> & { body: string };
export function parseContent(source: string): Entry {
  const { data, content } = matter(source);
  return { ...contentSchema.parse(data), body: content };
}
export function validateEntries(entries: Entry[]): Entry[] {
  const keys = new Set<string>();
  for (const e of entries) {
    const key = `${e.language}/${e.slug}`;
    if (keys.has(key)) throw new Error(`Duplicate content: ${key}`);
    keys.add(key);
  }
  return entries;
}
export function loadContent(): Entry[] {
  const files = fs
    .readdirSync(path.join(process.cwd(), "content"))
    .filter((f) => f.endsWith(".md"));
  const entries = files.map((file) => {
    try {
      return parseContent(
        fs.readFileSync(path.join(process.cwd(), "content", file), "utf8"),
      );
    } catch (error) {
      throw new Error(`Invalid content: ${file}`, { cause: error });
    }
  });
  return validateEntries(entries);
}
export function published(
  entries: Entry[],
  today = new Date().toISOString().slice(0, 10),
) {
  return entries
    .filter((e) => e.status === "published" && e.publicationDate <= today)
    .sort((a, b) => b.publicationDate.localeCompare(a.publicationDate));
}
export function getEntries(lang: Locale, section?: Section, category?: string) {
  return published(loadContent()).filter(
    (e) =>
      e.language === lang &&
      (!section || matchesSection(e, section)) &&
      (!category || e.category === category),
  );
}
export function matchesSection(e: Entry, section: Section) {
  return section === "reflexions"
    ? e.contentType === "reflection"
    : section === "observations"
      ? e.contentType !== "reflection"
      : e.category === (section === "societe" ? "societe" : "sport");
}
export function entrySection(e: Entry): "reflexions" | "observations" {
  return e.contentType === "reflection" ? "reflexions" : "observations";
}
export function entryPath(e: Entry, lang: Locale = e.language) {
  return `/${lang}/${entrySection(e)}/${e.slug}`;
}
export function featuredReflection(entries: Entry[]) {
  const reflections = entries.filter((e) => e.contentType === "reflection");
  return reflections.find((e) => e.featured) ?? reflections[0];
}
export function findEntry(lang: Locale, section: Section, slug: string) {
  return published(loadContent()).find(
    (e) => e.language === lang && e.slug === slug && matchesSection(e, section),
  );
}

export const observationTopics = [
  "sport",
  "societe",
  "culture",
  "education",
  "communaute",
  "humain",
] as const;
export type ObservationTopic = (typeof observationTopics)[number];
export function matchesTopic(entry: Entry, topic: string) {
  return (
    entry.category === topic || entry.topics.some((value) => value === topic)
  );
}
export function availableTopics(entries: Entry[]): ObservationTopic[] {
  return observationTopics.filter((topic) =>
    published(entries).some((entry) => matchesTopic(entry, topic)),
  );
}
export function relatedEntries(
  entry: Entry,
  entries: Entry[],
  limit = 3,
): Entry[] {
  const candidates = published(entries).filter(
    (other) => other.language === entry.language && other.slug !== entry.slug,
  );
  const scoped = entry.signature
    ? candidates.filter((other) => other.signature)
    : candidates.filter(
        (other) =>
          other.category === entry.category ||
          other.contentType === entry.contentType,
      );
  return scoped.slice(0, limit);
}
