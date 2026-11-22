// Only opaque sessions and expiring counters. Never store transcripts or audio here.
type LocalStore = Map<string, { value: string; until: number }>;
const runtime = globalThis as typeof globalThis & {
  __dsStudioDevStore?: LocalStore;
};
const local = (runtime.__dsStudioDevStore ??= new Map());
export async function redis(command: (string | number)[]) {
  const url = process.env.STUDIO_REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.STUDIO_REDIS_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("STORE_UNAVAILABLE");
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!r.ok) throw new Error("STORE_UNAVAILABLE");
  const data = await r.json();
  if (data.error) throw new Error("STORE_UNAVAILABLE");
  return data.result;
}
function development() {
  return (
    process.env.NODE_ENV !== "production" &&
    !process.env.VERCEL &&
    !process.env.STUDIO_REDIS_URL &&
    !process.env.UPSTASH_REDIS_REST_URL
  );
}
export async function get(key: string): Promise<string | null> {
  if (!development()) return redis(["GET", `studio:${key}`]);
  const v = local.get(key);
  if (!v || v.until < Date.now()) {
    local.delete(key);
    return null;
  }
  return v.value;
}
export async function set(key: string, value: string, ttl: number) {
  if (!development()) {
    await redis(["SET", `studio:${key}`, value, "EX", ttl]);
    return;
  }
  local.set(key, { value, until: Date.now() + ttl * 1000 });
}
export async function del(key: string) {
  if (!development()) {
    await redis(["DEL", `studio:${key}`]);
    return;
  }
  local.delete(key);
}
export async function limit(key: string, max: number, seconds: number) {
  if (!development()) {
    const script =
      "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n";
    return (
      Number(await redis(["EVAL", script, 1, `studio:rate:${key}`, seconds])) <=
      max
    );
  }
  // Single-process development only. Deployment requires atomic shared Redis.
  const n = Number((await get(`rate:${key}`)) || 0) + 1;
  const old = local.get(`rate:${key}`);
  local.set(`rate:${key}`, {
    value: String(n),
    until:
      old?.until && old.until > Date.now()
        ? old.until
        : Date.now() + seconds * 1000,
  });
  return n <= max;
}
