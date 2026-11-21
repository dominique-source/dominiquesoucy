import { randomUUID } from "node:crypto";
import type { InValue } from "@libsql/client";
import { database } from "./db";
import {
  checkText,
  type Question,
  type Category,
  type Curated,
  type Show,
} from "./schema";
import { deleteMedia } from "./media";
const publicSelect = (extra = "") =>
  `SELECT q.id,q.title,q.context,q.author,q.topic,q.format,q.transcript,q.created_at${extra},m.id media_id,m.duration,m.mime,m.width media_width,m.height media_height,(SELECT COUNT(*) FROM q_reactions r WHERE r.question_id=q.id) reactions,(SELECT COUNT(*) FROM q_replies r WHERE r.question_id=q.id) replies,EXISTS(SELECT 1 FROM q_reactions r WHERE r.question_id=q.id AND r.owner_hash=?) reacted,(q.owner_hash=?) own FROM q_questions q LEFT JOIN q_media m ON m.question_id=q.id`;
export type Filters = {
  search?: string;
  topic?: string;
  format?: string;
  sort?: string;
  date?: string;
  offset?: number;
  id?: string;
};
export async function settings() {
  const db = await database();
  const r = await db.execute("SELECT key,value FROM q_settings");
  return Object.fromEntries(
    r.rows.map((row) => [String(row.key), String(row.value)]),
  );
}
export async function feed(filters: Filters, owner = "", privateView = false) {
  const db = await database();
  const options = await settings();
  if (options.feed_hidden === "1" && !privateView)
    throw new Error("FEED_HIDDEN");
  const where = [privateView ? "1=1" : "q.hidden=0"];
  const args: InValue[] = [owner, owner];
  if (filters.id) {
    where.push("q.id=?");
    args.push(filters.id);
  }
  if (filters.topic) {
    where.push("q.topic=?");
    args.push(filters.topic);
  }
  if (filters.format) {
    where.push("q.format=?");
    args.push(filters.format);
  }
  if (filters.search) {
    const term = `%${filters.search.replace(/[\\%_]/g, "\\$&")}%`;
    where.push("(q.title LIKE ? ESCAPE '\\' OR q.context LIKE ? ESCAPE '\\')");
    args.push(term, term);
  }
  if (filters.date) {
    const time = Date.parse(filters.date + "T00:00:00Z");
    if (Number.isFinite(time)) {
      where.push("q.created_at>=? AND q.created_at<?");
      args.push(time, time + 86400000);
    }
  }
  const order =
    filters.sort === "popular"
      ? "reactions DESC,q.created_at DESC,q.id DESC"
      : filters.sort === "oldest"
        ? "q.created_at ASC,q.id ASC"
        : "q.created_at DESC,q.id DESC";
  const offset = Math.min(10000, Math.max(0, filters.offset || 0));
  args.push(41, offset);
  const r = await db.execute({
    sql: `${publicSelect()} WHERE ${where.join(" AND ")} ORDER BY ${order} LIMIT ? OFFSET ?`,
    args,
  });
  const questions = r.rows.slice(0, 40).map((row) => ({
    ...row,
    reacted: !!row.reacted,
    own: !!row.own,
  })) as unknown as Question[];
  const categories = (
    await db.execute(
      "SELECT c.id,c.fr,c.en,(SELECT COUNT(*) FROM q_questions q WHERE q.topic=c.id AND hidden=0) count FROM q_categories c ORDER BY rowid",
    )
  ).rows as unknown as Category[];
  return {
    questions,
    categories,
    hasMore: r.rows.length > 40,
    paused: options.paused === "1",
    updatedAt: Date.now(),
    total: Number(
      (await db.execute("SELECT COUNT(*) n FROM q_questions WHERE hidden=0"))
        .rows[0].n,
    ),
  };
}
export async function replies(id: string) {
  const db = await database();
  const r = await db.execute({
    sql: "SELECT r.id,r.author,r.text,r.created_at FROM q_replies r JOIN q_questions q ON q.id=r.question_id WHERE q.id=? AND q.hidden=0 ORDER BY r.created_at ASC LIMIT 200",
    args: [id],
  });
  return r.rows;
}
export async function createQuestion(
  input: {
    question: string;
    context: string;
    author: string;
    topic: string;
    format: string;
    transcript: string;
    reuseConsent: boolean;
    submissionId: string;
  },
  owner: string,
  source: string,
  media?: {
    key: string;
    mime: string;
    duration: number;
    size: number;
    width: number | null;
    height: number | null;
  },
) {
  const db = await database();
  if ((await settings()).paused === "1") throw new Error("POSTING_PAUSED");
  checkText(input.question, input.context, input.author, input.transcript);
  const existing = await db.execute({
    sql: "SELECT id FROM q_questions WHERE submission_key=?",
    args: [`${owner}:${input.submissionId}`],
  });
  if (existing.rows.length) return String(existing.rows[0].id);
  const recent = await db.execute({
    sql: "SELECT id FROM q_questions WHERE owner_hash=? AND title=? AND created_at>?",
    args: [owner, input.question, Date.now() - 86400000],
  });
  if (recent.rows.length) throw new Error("DUPLICATE_QUESTION");
  const id = randomUUID();
  await db.batch(
    [
      {
        sql: "INSERT INTO q_questions(id,title,context,author,topic,format,transcript,created_at,owner_hash,source_hash,reuse_consent,publish_consent,submission_key) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
        args: [
          id,
          input.question,
          input.context,
          input.author,
          input.topic,
          input.format,
          input.transcript,
          Date.now(),
          owner,
          source,
          Number(input.reuseConsent),
          1,
          `${owner}:${input.submissionId}`,
        ],
      },
      ...(media
        ? [
            {
              sql: "INSERT INTO q_media(id,question_id,storage_key,mime,duration,size,width,height) VALUES(?,?,?,?,?,?,?,?)",
              args: [
                randomUUID(),
                id,
                media.key,
                media.mime,
                media.duration,
                media.size,
                media.width,
                media.height,
              ],
            },
          ]
        : []),
    ],
    "write",
  );
  return id;
}
export async function addReply(
  id: string,
  text: string,
  author: string,
  owner: string,
) {
  checkText(text, author);
  const db = await database();
  if ((await settings()).paused === "1") throw new Error("POSTING_PAUSED");
  const r = await db.execute({
    sql: "INSERT INTO q_replies(id,question_id,text,author,owner_hash,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM q_questions WHERE id=? AND hidden=0)",
    args: [randomUUID(), id, text, author, owner, Date.now(), id],
  });
  if (!r.rowsAffected) throw new Error("NOT_FOUND");
}
export async function react(id: string, owner: string, source: string) {
  const db = await database();
  const tx = await db.transaction("write");
  try {
    if (
      !(
        await tx.execute({
          sql: "SELECT id FROM q_questions WHERE id=? AND hidden=0",
          args: [id],
        })
      ).rows.length
    )
      throw new Error("NOT_FOUND");
    const own = await tx.execute({
      sql: "DELETE FROM q_reactions WHERE question_id=? AND owner_hash=?",
      args: [id, owner],
    });
    if (!own.rowsAffected)
      await tx.execute({
        sql: "INSERT OR IGNORE INTO q_reactions(question_id,owner_hash,source_hash) VALUES(?,?,?)",
        args: [id, owner, source],
      });
    await tx.commit();
  } finally {
    tx.close();
  }
}
export async function report(
  id: string,
  owner: string,
  reason: string,
  detail: string,
) {
  const db = await database();
  await db.execute({
    sql: "INSERT OR IGNORE INTO q_reports(id,question_id,owner_hash,reason,detail,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM q_questions WHERE id=? AND hidden=0)",
    args: [randomUUID(), id, owner, reason, detail, Date.now(), id],
  });
}
export async function privateFeed(filters: Filters) {
  const db = await database();
  const result = await feed(filters, "", true);
  const curations = await db.execute(
    "SELECT question_id,notes,stage FROM q_curation",
  );
  const extra = await db.execute(
    "SELECT id,hidden,reuse_consent FROM q_questions",
  );
  const reports = await db.execute(
    "SELECT question_id,reason,detail FROM q_reports ORDER BY created_at DESC",
  );
  const questions = result.questions.map((q) => {
    const c = curations.rows.find((r) => r.question_id === q.id);
    const e = extra.rows.find((r) => r.id === q.id);
    const issues = reports.rows
      .filter((r) => r.question_id === q.id)
      .map((r) => ({ reason: String(r.reason), detail: String(r.detail) }));
    return {
      ...q,
      notes: c?.notes || "",
      stage: c?.stage || "todo",
      hidden: e?.hidden || 0,
      reuse_consent: e?.reuse_consent || 0,
      report_count: issues.length,
      reports: issues,
    };
  }) as Curated[];
  return {
    ...result,
    questions,
    show: await currentShow(),
    settings: await settings(),
  };
}
export async function currentShow(): Promise<Show> {
  const db = await database();
  const r = await db.execute(
    "SELECT title,revision FROM q_shows WHERE id='current'",
  );
  return {
    title: String(r.rows[0]?.title || ""),
    revision: Number(r.rows[0]?.revision || 0),
    items: (
      await db.execute(
        "SELECT question_id FROM q_show_items WHERE show_id='current' ORDER BY position",
      )
    ).rows.map((r) => String(r.question_id)),
  };
}
export async function saveShow(
  title: string,
  items: string[],
  revision: number,
) {
  const db = await database();
  const tx = await db.transaction("write");
  try {
    await tx.execute({
      sql: "INSERT OR IGNORE INTO q_shows(id,title,revision) VALUES('current',?,0)",
      args: [title],
    });
    const r = await tx.execute({
      sql: "UPDATE q_shows SET title=?,revision=revision+1 WHERE id='current' AND revision=?",
      args: [title, revision],
    });
    if (!r.rowsAffected) throw new Error("CONFLICT_REFRESH");
    if (new Set(items).size !== items.length) throw new Error("INVALID_SHOW");
    for (const id of items) {
      if (
        !(
          await tx.execute({
            sql: "SELECT id FROM q_questions WHERE id=? AND hidden=0",
            args: [id],
          })
        ).rows.length
      )
        throw new Error("INVALID_SHOW");
    }
    await tx.execute("DELETE FROM q_show_items WHERE show_id='current'");
    for (const [position, id] of items.entries()) {
      await tx.execute({
        sql: "INSERT INTO q_show_items(show_id,question_id,position) VALUES('current',?,?)",
        args: [id, position],
      });
      await tx.execute({
        sql: "INSERT INTO q_curation(question_id,stage) VALUES(?,'selected') ON CONFLICT(question_id) DO UPDATE SET stage='selected'",
        args: [id],
      });
    }
    await tx.commit();
  } finally {
    tx.close();
  }
}
export async function curate(id: string, notes: string, stage: string) {
  const db = await database();
  await db.execute({
    sql: "INSERT INTO q_curation(question_id,notes,stage) VALUES(?,?,?) ON CONFLICT(question_id) DO UPDATE SET notes=excluded.notes,stage=excluded.stage",
    args: [id, notes, stage],
  });
}
export async function hide(id: string, hidden: boolean) {
  const db = await database();
  await db.execute({
    sql: "UPDATE q_questions SET hidden=? WHERE id=?",
    args: [Number(hidden), id],
  });
  if (hidden)
    await db.execute({
      sql: "DELETE FROM q_show_items WHERE question_id=?",
      args: [id],
    });
}
export async function remove(id: string, owner?: string) {
  const db = await database();
  const q = await db.execute({
    sql: "SELECT owner_hash FROM q_questions WHERE id=?",
    args: [id],
  });
  if (!q.rows.length) throw new Error("NOT_FOUND");
  if (owner && q.rows[0].owner_hash !== owner) throw new Error("FORBIDDEN");
  await hide(id, true);
  const media = await db.execute({
    sql: "SELECT storage_key FROM q_media WHERE question_id=?",
    args: [id],
  });
  for (const m of media.rows) await deleteMedia(String(m.storage_key));
  await db.execute({ sql: "DELETE FROM q_questions WHERE id=?", args: [id] });
}
export async function setSetting(key: string, value: boolean) {
  const db = await database();
  await db.execute({
    sql: "INSERT INTO q_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    args: [key, value ? "1" : "0"],
  });
}
export async function mediaRecord(id: string, privateView = false) {
  const db = await database();
  return (
    await db.execute({
      sql: `SELECT m.* FROM q_media m JOIN q_questions q ON q.id=m.question_id WHERE m.id=? ${privateView ? "" : "AND q.hidden=0"}`,
      args: [id],
    })
  ).rows[0];
}

export async function selectedQuestions() {
  const db = await database();
  return (
    await db.execute({
      sql: `${publicSelect(",q.reuse_consent,q.hidden")} JOIN q_show_items si ON si.question_id=q.id WHERE si.show_id='current' AND q.hidden=0 ORDER BY si.position`,
      args: ["", ""],
    })
  ).rows;
}
