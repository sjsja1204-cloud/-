// 관리자: 이벤트 팝업 등록·수정·켜기/끄기·순서
import { Router } from "express";
import { z } from "zod";
import { query, tx } from "../../db.js";
import { ah, parse, HttpError, toInt } from "../../lib/http.js";
import { logAccess } from "../../lib/accessLog.js";
import { isLink } from "../../lib/content.js";

const router = Router();
const date = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다."), z.literal(""), z.null()])
  .transform((v) => v || null);

const popupSchema = z.object({
  imageUrl: z.string().trim().max(500).refine((v) => !v || /^(\/|https?:\/\/)\S+$/.test(v), "이미지 주소가 올바르지 않습니다.").default(""),
  alt: z.string().trim().max(100).default(""),
  link: z.string().trim().max(500).refine((v) => !v || isLink(v), "링크는 / 또는 # 또는 https:// 로 시작해야 합니다.").default(""),
  title: z.string().trim().max(100).default(""),
  body: z.string().trim().max(500).default(""),
  buttonText: z.string().trim().max(30).default(""),
  startAt: date.default(null),
  endAt: date.default(null),
  isActive: z.boolean().default(true),
}).refine((p) => p.imageUrl || p.title, { message: "이미지를 올리거나 제목을 입력하세요.", path: ["imageUrl"] })
  .refine((p) => !p.startAt || !p.endAt || p.startAt <= p.endAt, { message: "종료일이 시작일보다 빠릅니다.", path: ["endAt"] });

const FIELDS = `id, image_url, alt, link, title, body, button_text, start_at, end_at, is_active, sort_order, created_at, updated_at,
  (is_active AND (start_at IS NULL OR start_at <= (now() AT TIME ZONE 'Asia/Seoul')::date)
             AND (end_at   IS NULL OR end_at   >= (now() AT TIME ZONE 'Asia/Seoul')::date)) AS is_showing`;

router.get("/", ah(async (req, res) => {
  const { rows } = await query(`SELECT ${FIELDS} FROM popups ORDER BY sort_order, id`);
  res.json({ items: rows });
}));

const values = (p) => [p.imageUrl || null, p.alt, p.link, p.title, p.body, p.buttonText, p.startAt, p.endAt, p.isActive];

router.post("/", ah(async (req, res) => {
  const p = parse(popupSchema, req.body);
  const { rows } = await query(
    `INSERT INTO popups (image_url, alt, link, title, body, button_text, start_at, end_at, is_active, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, (SELECT COALESCE(max(sort_order), 0) + 1 FROM popups)) RETURNING id`,
    values(p)
  );
  await logAccess(req, "popup.create", rows[0].id, p.title || p.alt || "이미지 팝업");
  res.status(201).json({ id: rows[0].id });
}));

router.put("/:id", ah(async (req, res) => {
  const id = toInt(req.params.id);
  const p = parse(popupSchema, req.body);
  const { rowCount } = await query(
    `UPDATE popups SET image_url=$2, alt=$3, link=$4, title=$5, body=$6, button_text=$7, start_at=$8, end_at=$9, is_active=$10, updated_at=now()
      WHERE id = $1`,
    [id, ...values(p)]
  );
  if (!rowCount) throw new HttpError(404, "팝업을 찾을 수 없습니다.");
  await logAccess(req, "popup.update", id, `${p.title || "이미지 팝업"} ${p.isActive ? "켜짐" : "꺼짐"}`);
  res.json({ ok: true });
}));

// 켜기/끄기만 (모바일에서 간단히)
router.patch("/:id/active", ah(async (req, res) => {
  const id = toInt(req.params.id);
  const { isActive } = parse(z.object({ isActive: z.boolean() }), req.body);
  const { rowCount } = await query("UPDATE popups SET is_active = $2, updated_at = now() WHERE id = $1", [id, isActive]);
  if (!rowCount) throw new HttpError(404, "팝업을 찾을 수 없습니다.");
  await logAccess(req, "popup.update", id, isActive ? "켜짐" : "꺼짐");
  res.json({ ok: true });
}));

router.post("/order", ah(async (req, res) => {
  const { ids } = parse(z.object({ ids: z.array(z.number().int().positive()).min(1).max(100) }), req.body);
  await tx(async (c) => {
    for (const [i, id] of ids.entries()) await c.query("UPDATE popups SET sort_order = $2 WHERE id = $1", [id, i + 1]);
  });
  res.json({ ok: true });
}));

router.delete("/:id", ah(async (req, res) => {
  const id = toInt(req.params.id);
  const { rows } = await query("DELETE FROM popups WHERE id = $1 RETURNING title", [id]);
  if (!rows[0]) throw new HttpError(404, "팝업을 찾을 수 없습니다.");
  await logAccess(req, "popup.delete", id, rows[0].title || "이미지 팝업");
  res.json({ ok: true });
}));

export default router;
