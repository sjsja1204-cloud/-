// 관리자: 요금표·메인 문구 임시저장 / 미리보기 / 게시 / 버전 되돌리기
import { Router } from "express";
import { z } from "zod";
import { query } from "../../db.js";
import { ah, parse, HttpError, toInt } from "../../lib/http.js";
import { logAccess } from "../../lib/accessLog.js";
import { CONTENT_KEYS, contentSchemas, getRow, saveDraft, publish, publishIssues } from "../../lib/content.js";

const router = Router();
const LABEL = { plans: "요금표", hero: "메인 배너", benefits: "혜택 강조 문구", quote: "간편 견적" };

function keyOf(req) {
  const key = req.params.key;
  if (!CONTENT_KEYS.includes(key)) throw new HttpError(404, "존재하지 않는 항목입니다.");
  return key;
}
const dataOf = (key, body) => parse(z.object({ data: contentSchemas[key] }), body).data;

// 미리보기: 모든 임시저장본
router.get("/preview", ah(async (req, res) => {
  const { rows } = await query("SELECT key, draft FROM site_content");
  res.set("Cache-Control", "no-store");
  res.json(Object.fromEntries(rows.map((r) => [r.key, r.draft])));
}));

router.get("/:key", ah(async (req, res) => {
  const key = keyOf(req);
  const row = await getRow(key);
  res.set("Cache-Control", "no-store");
  res.json({ ...row, issues: publishIssues(key, row.draft) });
}));

router.put("/:key/draft", ah(async (req, res) => {
  const key = keyOf(req);
  const data = dataOf(key, req.body);
  await saveDraft(key, data, req.user.id);
  res.json({ ok: true, issues: publishIssues(key, data) });
}));

router.post("/:key/publish", ah(async (req, res) => {
  const key = keyOf(req);
  const data = dataOf(key, req.body);
  await publish(key, data, req.user.id);
  await logAccess(req, "content.publish", key, `${LABEL[key]} 사이트 반영`);
  res.json({ ok: true });
}));

router.get("/:key/versions", ah(async (req, res) => {
  const key = keyOf(req);
  const { rows } = await query(
    `SELECT v.id, v.published_at, v.note, u.name AS published_by_name
       FROM content_versions v LEFT JOIN users u ON u.id = v.published_by
      WHERE v.content_key = $1 ORDER BY v.published_at DESC, v.id DESC`,
    [key]
  );
  res.json({ items: rows });
}));

router.post("/:key/versions/:id/revert", ah(async (req, res) => {
  const key = keyOf(req);
  const id = toInt(req.params.id);
  const { rows } = await query("SELECT id, data, published_at FROM content_versions WHERE id = $1 AND content_key = $2", [id, key]);
  if (!rows[0]) throw new HttpError(404, "버전을 찾을 수 없습니다.");
  const data = parse(contentSchemas[key], rows[0].data);
  const when = new Date(rows[0].published_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  await publish(key, data, req.user.id, `${when} 버전으로 되돌림`);
  await logAccess(req, "content.revert", key, `${LABEL[key]} 버전 #${id} (${when}) 으로 되돌림`);
  res.json({ ok: true });
}));

export default router;
