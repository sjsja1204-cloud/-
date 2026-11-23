// 관리자: 사업자 정보 · 접수 폼 선택지 · 텔레그램 Chat ID · 상태값
import { Router } from "express";
import { z } from "zod";
import { query, tx } from "../../db.js";
import { ah, parse, HttpError, toInt } from "../../lib/http.js";
import { logAccess } from "../../lib/accessLog.js";
import { SETTING_KEYS, settingSchemas, getSetting, saveSetting } from "../../lib/settings.js";
import { config } from "../../config.js";

const router = Router();
const LABEL = { business: "사업자 정보", form_options: "접수 폼 선택지", telegram: "텔레그램 알림", brand: "브랜드 색상", consult: "빠른 상담 메뉴" };

router.get("/", ah(async (req, res) => {
  const out = {};
  for (const k of SETTING_KEYS) out[k] = await getSetting(k);
  res.set("Cache-Control", "no-store");
  res.json({ ...out, env: { telegramToken: Boolean(config.telegram.token), r2: config.r2.enabled } });
}));

// ───────── 상태값 ─────────
router.get("/statuses", ah(async (req, res) => {
  const { rows } = await query(
    `SELECT s.id, s.name, s.sort_order, s.is_final, s.is_default, s.is_hidden,
            (SELECT count(*)::int FROM leads l WHERE l.status_id = s.id) AS lead_count
       FROM lead_statuses s ORDER BY s.sort_order, s.id`
  );
  res.json({ items: rows });
}));

const statusSchema = z.object({
  name: z.string().trim().min(1, "상태 이름을 입력하세요.").max(20, "상태 이름은 20자 이내로 입력하세요."),
  isFinal: z.boolean().default(false),
  isHidden: z.boolean().default(false),
});

const nameTaken = async (name, exceptId = 0) =>
  (await query("SELECT 1 FROM lead_statuses WHERE name = $1 AND id <> $2", [name, exceptId])).rows.length > 0;

router.post("/statuses", ah(async (req, res) => {
  const b = parse(statusSchema, req.body);
  if (await nameTaken(b.name)) throw new HttpError(409, "같은 이름의 상태가 있습니다.");
  const { rows } = await query(
    `INSERT INTO lead_statuses (name, is_final, is_hidden, sort_order)
     VALUES ($1, $2, $3, (SELECT COALESCE(max(sort_order), 0) + 1 FROM lead_statuses)) RETURNING id`,
    [b.name, b.isFinal, b.isHidden]
  );
  await logAccess(req, "settings.status.create", rows[0].id, b.name);
  res.status(201).json({ id: rows[0].id });
}));

router.put("/statuses/:id", ah(async (req, res) => {
  const id = toInt(req.params.id);
  const b = parse(statusSchema, req.body);
  const cur = (await query("SELECT name, is_default FROM lead_statuses WHERE id = $1", [id])).rows[0];
  if (!cur) throw new HttpError(404, "상태를 찾을 수 없습니다.");
  if (cur.is_default && b.isHidden) throw new HttpError(400, "새 접수에 붙는 기본 상태는 숨길 수 없습니다.");
  if (await nameTaken(b.name, id)) throw new HttpError(409, "같은 이름의 상태가 있습니다.");
  await query("UPDATE lead_statuses SET name = $2, is_final = $3, is_hidden = $4 WHERE id = $1", [id, b.name, b.isFinal, b.isHidden]);
  await logAccess(req, "settings.status.update", id, `${cur.name} → ${b.name}${b.isHidden ? " (숨김)" : ""}`);
  res.json({ ok: true });
}));

router.post("/statuses/order", ah(async (req, res) => {
  const { ids } = parse(z.object({ ids: z.array(z.number().int().positive()).min(1).max(50) }), req.body);
  await tx(async (c) => {
    for (const [i, id] of ids.entries()) await c.query("UPDATE lead_statuses SET sort_order = $2 WHERE id = $1", [id, i + 1]);
  });
  await logAccess(req, "settings.status.order", null, ids.join(","));
  res.json({ ok: true });
}));

router.delete("/statuses/:id", ah(async (req, res) => {
  const id = toInt(req.params.id);
  const cur = (await query(
    `SELECT s.name, s.is_default,
            EXISTS (SELECT 1 FROM leads WHERE status_id = s.id)
         OR EXISTS (SELECT 1 FROM lead_status_history WHERE from_status = s.id OR to_status = s.id) AS used
       FROM lead_statuses s WHERE s.id = $1`, [id])).rows[0];
  if (!cur) throw new HttpError(404, "상태를 찾을 수 없습니다.");
  if (cur.is_default) throw new HttpError(400, "기본 상태는 삭제할 수 없습니다.");
  if (cur.used) throw new HttpError(409, "이미 사용된 상태라 삭제할 수 없습니다. 대신 '숨기기'를 켜 주세요.");
  await query("DELETE FROM lead_statuses WHERE id = $1", [id]);
  await logAccess(req, "settings.status.delete", id, cur.name);
  res.json({ ok: true });
}));

// ───────── 사업자 정보 / 폼 선택지 / 텔레그램 ─────────
router.put("/:key", ah(async (req, res) => {
  const key = req.params.key;
  if (!SETTING_KEYS.includes(key)) throw new HttpError(404, "존재하지 않는 설정입니다.");
  const value = parse(settingSchemas[key], req.body);
  await saveSetting(key, value, req.user.id);
  await logAccess(req, "settings.update", key, `${LABEL[key]} 변경`);
  res.json({ ok: true, value });
}));

export default router;
