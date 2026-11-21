import { createClient, type Client } from "@libsql/client";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { topics } from "./schema";
const globalDb = globalThis as typeof globalThis & {
  questionsDb?: { url: string; client: Client; ready: Promise<void> };
};
export async function database() {
  const remote = process.env.QUESTIONS_DATABASE_URL;
  const deployed = process.env.VERCEL || process.env.NODE_ENV === "production";
  if (deployed && (!remote || remote.startsWith("file:")))
    throw new Error("DATABASE_NOT_CONFIGURED");
  if (!remote) await mkdir(resolve(".data"), { recursive: true });
  const url = remote || `file:${resolve(".data/questions.db")}`;
  if (globalDb.questionsDb?.url !== url) {
    const client = createClient({
      url,
      authToken: process.env.QUESTIONS_DATABASE_AUTH_TOKEN,
    });
    globalDb.questionsDb = { url, client, ready: initialize(client) };
  }
  await globalDb.questionsDb.ready;
  return globalDb.questionsDb.client;
}
async function initialize(db: Client) {
  await db.execute("PRAGMA foreign_keys=ON");
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS q_categories(id TEXT PRIMARY KEY,fr TEXT NOT NULL,en TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS q_questions(id TEXT PRIMARY KEY,title TEXT NOT NULL,context TEXT NOT NULL,author TEXT NOT NULL,topic TEXT NOT NULL REFERENCES q_categories(id),format TEXT NOT NULL,transcript TEXT NOT NULL,created_at INTEGER NOT NULL,owner_hash TEXT NOT NULL,source_hash TEXT NOT NULL,reuse_consent INTEGER NOT NULL,publish_consent INTEGER NOT NULL,hidden INTEGER NOT NULL DEFAULT 0,submission_key TEXT NOT NULL UNIQUE)`,
      `CREATE TABLE IF NOT EXISTS q_media(id TEXT PRIMARY KEY,question_id TEXT NOT NULL UNIQUE REFERENCES q_questions(id) ON DELETE CASCADE,storage_key TEXT NOT NULL,mime TEXT NOT NULL,duration REAL NOT NULL,size INTEGER NOT NULL,width INTEGER,height INTEGER)`,
      `CREATE TABLE IF NOT EXISTS q_replies(id TEXT PRIMARY KEY,question_id TEXT NOT NULL REFERENCES q_questions(id) ON DELETE CASCADE,author TEXT NOT NULL,text TEXT NOT NULL,created_at INTEGER NOT NULL,owner_hash TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS q_reactions(question_id TEXT NOT NULL REFERENCES q_questions(id) ON DELETE CASCADE,owner_hash TEXT NOT NULL,source_hash TEXT NOT NULL,PRIMARY KEY(question_id,owner_hash),UNIQUE(question_id,source_hash))`,
      `CREATE TABLE IF NOT EXISTS q_reports(id TEXT PRIMARY KEY,question_id TEXT NOT NULL REFERENCES q_questions(id) ON DELETE CASCADE,owner_hash TEXT NOT NULL,reason TEXT NOT NULL,detail TEXT NOT NULL,created_at INTEGER NOT NULL,UNIQUE(question_id,owner_hash))`,
      `CREATE TABLE IF NOT EXISTS q_curation(question_id TEXT PRIMARY KEY REFERENCES q_questions(id) ON DELETE CASCADE,notes TEXT NOT NULL DEFAULT '',stage TEXT NOT NULL DEFAULT 'todo')`,
      `CREATE TABLE IF NOT EXISTS q_shows(id TEXT PRIMARY KEY,title TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0)`,
      `CREATE TABLE IF NOT EXISTS q_show_items(show_id TEXT NOT NULL REFERENCES q_shows(id) ON DELETE CASCADE,question_id TEXT NOT NULL REFERENCES q_questions(id) ON DELETE CASCADE,position INTEGER NOT NULL,PRIMARY KEY(show_id,question_id),UNIQUE(show_id,position))`,
      `CREATE TABLE IF NOT EXISTS q_rates(key TEXT PRIMARY KEY,n INTEGER NOT NULL,expires INTEGER NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS q_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL)`,
      `CREATE INDEX IF NOT EXISTS q_chronology ON q_questions(hidden,created_at DESC,id)`,
      `CREATE INDEX IF NOT EXISTS q_reply_parent ON q_replies(question_id,created_at)`,
      ...topics.map((t) => ({
        sql: "INSERT OR IGNORE INTO q_categories(id,fr,en) VALUES(?,?,?)",
        args: [t.id, t.fr, t.en],
      })),
    ],
    "write",
  );
}
export async function throttle(key: string, max: number, seconds: number) {
  const db = await database();
  const now = Date.now();
  const r = await db.execute({
    sql: `INSERT INTO q_rates(key,n,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET n=CASE WHEN expires<? THEN 1 ELSE n+1 END, expires=CASE WHEN expires<? THEN excluded.expires ELSE expires END RETURNING n`,
    args: [key, now + seconds * 1000, now, now],
  });
  if (Number(r.rows[0].n) > max) throw new Error("RATE_LIMITED");
}
