// migrations/*.sql 을 파일명 순서대로 1회씩 실행 (schema_migrations 테이블에 기록)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../src/db.js";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");

const client = await pool.connect();
try {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  const done = new Set((await client.query("SELECT filename FROM schema_migrations")).rows.map((r) => r.filename));
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    if (done.has(f)) {
      console.log(`skip  ${f}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(dir, f), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [f]);
      await client.query("COMMIT");
      console.log(`apply ${f}`);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  }
  console.log("migrations complete");

  // 콘텐츠·설정 최초 시드: 비어 있는 항목만 채움 (관리자가 고친 값은 절대 덮어쓰지 않음)
  const seed = await import("../seed/defaults.js");
  for (const [key, data] of Object.entries(seed.content)) {
    const r = await client.query(
      "INSERT INTO site_content (key, draft, published) VALUES ($1, $2, $2) ON CONFLICT (key) DO NOTHING",
      [key, data]
    );
    if (r.rowCount) {
      await client.query("INSERT INTO content_versions (content_key, data, note) VALUES ($1, $2, '최초 시드')", [key, data]);
      console.log(`seed  content:${key}`);
    }
  }
  for (const [key, value] of Object.entries(seed.settings)) {
    const r = await client.query("INSERT INTO site_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING", [key, value]);
    if (r.rowCount) console.log(`seed  settings:${key}`);
  }
  // 팝업은 최초 1회만 (관리자가 전부 지워도 다시 생기지 않도록 표시를 남김)
  const marked = await client.query("INSERT INTO site_settings (key, value) VALUES ('_seeded_popups', 'true') ON CONFLICT (key) DO NOTHING");
  if (marked.rowCount) {
    for (const [i, p] of seed.popups.entries()) {
      await client.query(
        `INSERT INTO popups (image_url, alt, link, title, body, button_text, start_at, end_at, is_active, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [p.image_url, p.alt, p.link, p.title, p.body, p.button_text, p.start_at, p.end_at, p.is_active, i + 1]
      );
    }
    console.log(`seed  popups (${seed.popups.length})`);
  }
  // 자주 묻는 질문 예시: 최초 1회, FAQ 가 비어 있을 때만 (관리자가 전부 지워도 다시 생기지 않도록 표시를 남김)
  const faqMarked = await client.query("INSERT INTO site_settings (key, value) VALUES ('_seeded_faqs', 'true') ON CONFLICT (key) DO NOTHING");
  if (faqMarked.rowCount) {
    const { rows } = await client.query("SELECT count(*)::int AS n FROM faqs");
    if (rows[0].n === 0) {
      const { faqs } = await import("../seed/faqs.js");
      for (const [i, [category, question, answer]] of faqs.entries()) {
        await client.query(
          "INSERT INTO faqs (category, question, answer, is_published, sort_order) VALUES ($1,$2,$3,true,$4)",
          [category, question, answer, i]
        );
      }
      console.log(`seed  faqs (${faqs.length})`);
    }
  }
} finally {
  client.release();
  await pool.end();
}
