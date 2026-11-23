// 후기(관리자가 실제 고객 후기 등록) · 자주 묻는 질문 — 공개 API + 관리자 API
import { Router } from "express";
import { z } from "zod";
import { query, pool } from "../db.js";
import { ah, parse, HttpError, toInt } from "../lib/http.js";
import { logAccess } from "../lib/accessLog.js";

export const FAQ_CATEGORIES = ["가입", "설치", "사은품", "해지·변경", "기타"];
export const REVIEW_PRODUCTS = ["인터넷", "인터넷+TV", "인터넷+TV+유심", "휴대폰", "결합상품"];

/** 공개 화면용 이름 가림: 홍길동 → 홍*동, 홍길 → 홍*, 남궁민수 → 남**수 (이미 * 가 있으면 그대로) */
export function maskName(name) {
  const s = [...String(name || "").trim()];
  if (!s.length) return "고객";
  if (s.includes("*")) return s.join("");
  if (s.length === 1) return s[0];
  if (s.length === 2) return s[0] + "*";
  return s[0] + "*".repeat(s.length - 2) + s[s.length - 1];
}

const kstDate = (d) => (d instanceof Date ? d.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }) : String(d).slice(0, 10));
const publicReview = (r) => ({
  id: r.id, name: maskName(r.customer_name), carrier: r.carrier, product: r.product, rating: r.rating,
  content: r.content, date: kstDate(r.review_date), imageUrl: r.image_url || "",
});
const REVIEW_ORDER = "sort_order ASC, review_date DESC, id DESC";

// ───────── 공개 ─────────
export const publicRouter = Router();

publicRouter.get("/reviews", ah(async (req, res) => {
  const q = parse(z.object({
    carrier: z.string().trim().max(50).optional().default(""),
    offset: z.coerce.number().int().min(0).max(100000).default(0),
    limit: z.coerce.number().int().min(1).max(30).default(10),
  }), req.query);
  const where = ["is_published"];
  const args = [];
  if (q.carrier) { args.push(q.carrier); where.push(`carrier = $${args.length}`); }
  const w = where.join(" AND ");
  const [list, total, carriers] = await Promise.all([
    query(`SELECT * FROM reviews WHERE ${w} ORDER BY ${REVIEW_ORDER} LIMIT ${q.limit} OFFSET ${q.offset}`, args),
    query(`SELECT count(*)::int AS n FROM reviews WHERE ${w}`, args),
    query(`SELECT carrier, count(*)::int AS n FROM reviews WHERE is_published AND carrier <> '' GROUP BY carrier ORDER BY n DESC, carrier`),
  ]);
  res.json({ items: list.rows.map(publicReview), total: total.rows[0].n, carriers: carriers.rows.map((r) => r.carrier) });
}));

publicRouter.get("/faqs", ah(async (req, res) => {
  const { rows } = await query("SELECT id, category, question, answer FROM faqs WHERE is_published ORDER BY sort_order ASC, id ASC LIMIT 500");
  res.json({ items: rows, categories: FAQ_CATEGORIES });
}));

// ───────── 관리자 ─────────
const urlOrEmpty = z.string().trim().max(1000)
  .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//.test(v), "이미지 주소가 올바르지 않습니다.")
  .optional().default("").transform((v) => v || null);

const reviewSchema = z.object({
  customerName: z.string().trim().min(1, "고객 이름을 입력하세요.").max(30),
  carrier: z.string().trim().max(50).default(""),
  product: z.string().trim().max(50).default(""),
  rating: z.number().int().min(1, "별점을 선택하세요.").max(5),
  content: z.string().trim().min(1, "후기 내용을 입력하세요.").max(3000, "후기는 3000자 이내로 입력하세요."),
  reviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "작성일을 선택하세요."),
  imageUrl: urlOrEmpty,
  isPublished: z.boolean().default(true),
});
const faqSchema = z.object({
  category: z.enum(FAQ_CATEGORIES, { errorMap: () => ({ message: "카테고리를 선택하세요." }) }),
  question: z.string().trim().min(1, "질문을 입력하세요.").max(300),
  answer: z.string().trim().min(1, "답변을 입력하세요.").max(5000),
  isPublished: z.boolean().default(true),
});
const orderSchema = z.object({ ids: z.array(z.number().int().positive()).min(1).max(2000) });

/** 목록 순서 저장: 받은 id 순서대로 sort_order = 0,1,2… (한 번에) */
async function saveOrder(table, ids) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const { rows } = await c.query(`SELECT id FROM ${table}`);
    const all = new Set(rows.map((r) => r.id));
    if (ids.length !== all.size || ids.some((id) => !all.has(id)) || new Set(ids).size !== ids.length) {
      throw new HttpError(409, "목록이 바뀌었습니다. 새로고침 후 다시 시도해 주세요.");
    }
    await c.query(`UPDATE ${table} t SET sort_order = o.n - 1 FROM unnest($1::int[]) WITH ORDINALITY o(id, n) WHERE t.id = o.id`, [ids]);
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}

export const adminReviewRouter = Router();

adminReviewRouter.get("/", ah(async (req, res) => {
  const { rows } = await query(`SELECT r.*, to_char(r.review_date, 'YYYY-MM-DD') AS review_day, u.name AS author_name
                                  FROM reviews r LEFT JOIN users u ON u.id = r.author_id ORDER BY ${REVIEW_ORDER}`);
  res.json({ items: rows, products: REVIEW_PRODUCTS });
}));

adminReviewRouter.post("/", ah(async (req, res) => {
  const d = parse(reviewSchema, req.body);
  // 새 후기는 맨 위에 (목록 순서 = 홈페이지 표시 순서)
  const { rows } = await query(
    `INSERT INTO reviews (customer_name, carrier, product, rating, content, review_date, image_url, is_published, sort_order, author_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8, (SELECT COALESCE(min(sort_order), 1) - 1 FROM reviews), $9) RETURNING id`,
    [d.customerName, d.carrier, d.product, d.rating, d.content, d.reviewDate, d.imageUrl, d.isPublished, req.user.id]
  );
  await logAccess(req, "review_create", rows[0].id);
  res.status(201).json({ id: rows[0].id });
}));

adminReviewRouter.put("/order", ah(async (req, res) => {
  const { ids } = parse(orderSchema, req.body);
  await saveOrder("reviews", ids);
  await logAccess(req, "review_order", null, { count: ids.length });
  res.json({ ok: true });
}));

adminReviewRouter.post("/sort-by-date", ah(async (req, res) => {
  await query(`UPDATE reviews r SET sort_order = o.n - 1
                 FROM (SELECT id, row_number() OVER (ORDER BY review_date DESC, id DESC) AS n FROM reviews) o WHERE r.id = o.id`);
  await logAccess(req, "review_order", null, { byDate: true });
  res.json({ ok: true });
}));

adminReviewRouter.put("/:id", ah(async (req, res) => {
  const id = toInt(req.params.id);
  const d = parse(reviewSchema, req.body);
  const { rowCount } = await query(
    `UPDATE reviews SET customer_name=$1, carrier=$2, product=$3, rating=$4, content=$5, review_date=$6, image_url=$7,
            is_published=$8, updated_at=now() WHERE id=$9`,
    [d.customerName, d.carrier, d.product, d.rating, d.content, d.reviewDate, d.imageUrl, d.isPublished, id]
  );
  if (!rowCount) throw new HttpError(404, "후기를 찾을 수 없습니다.");
  await logAccess(req, "review_update", id);
  res.json({ ok: true });
}));

adminReviewRouter.delete("/:id", ah(async (req, res) => {
  const id = toInt(req.params.id);
  const { rowCount } = await query("DELETE FROM reviews WHERE id = $1", [id]);
  if (!rowCount) throw new HttpError(404, "후기를 찾을 수 없습니다.");
  await logAccess(req, "review_delete", id);
  res.json({ ok: true });
}));

export const adminFaqRouter = Router();

adminFaqRouter.get("/", ah(async (req, res) => {
  const { rows } = await query("SELECT * FROM faqs ORDER BY sort_order ASC, id ASC");
  res.json({ items: rows, categories: FAQ_CATEGORIES });
}));

adminFaqRouter.post("/", ah(async (req, res) => {
  const d = parse(faqSchema, req.body);
  // 새 질문은 맨 아래에
  const { rows } = await query(
    `INSERT INTO faqs (category, question, answer, is_published, sort_order)
     VALUES ($1,$2,$3,$4, (SELECT COALESCE(max(sort_order), -1) + 1 FROM faqs)) RETURNING id`,
    [d.category, d.question, d.answer, d.isPublished]
  );
  await logAccess(req, "faq_create", rows[0].id);
  res.status(201).json({ id: rows[0].id });
}));

adminFaqRouter.put("/order", ah(async (req, res) => {
  const { ids } = parse(orderSchema, req.body);
  await saveOrder("faqs", ids);
  await logAccess(req, "faq_order", null, { count: ids.length });
  res.json({ ok: true });
}));

adminFaqRouter.put("/:id", ah(async (req, res) => {
  const id = toInt(req.params.id);
  const d = parse(faqSchema, req.body);
  const { rowCount } = await query(
    "UPDATE faqs SET category=$1, question=$2, answer=$3, is_published=$4, updated_at=now() WHERE id=$5",
    [d.category, d.question, d.answer, d.isPublished, id]
  );
  if (!rowCount) throw new HttpError(404, "질문을 찾을 수 없습니다.");
  await logAccess(req, "faq_update", id);
  res.json({ ok: true });
}));

adminFaqRouter.delete("/:id", ah(async (req, res) => {
  const id = toInt(req.params.id);
  const { rowCount } = await query("DELETE FROM faqs WHERE id = $1", [id]);
  if (!rowCount) throw new HttpError(404, "질문을 찾을 수 없습니다.");
  await logAccess(req, "faq_delete", id);
  res.json({ ok: true });
}));
