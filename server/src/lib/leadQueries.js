import { z } from "zod";
import { query } from "../db.js";
import { PRODUCTS, CARRIERS, SOURCES } from "./constants.js";
import { digitsOnly, isValidMobile } from "./phone.js";

/** 목록/상세 공통 SELECT (상태명, 담당자명, 중복 여부, 최근 메모 포함) */
export const LEAD_SELECT = `
  SELECT l.id, l.name, l.phone, l.products, l.carrier, l.call_time, l.message, l.source,
         l.utm_source, l.utm_medium, l.utm_campaign, l.referrer,
         l.status_id, s.name AS status_name, s.is_final,
         l.assignee_id, a.name AS assignee_name, l.assigned_at,
         l.created_by, c.name AS created_by_name, l.upload_batch_id, l.consent_at,
         l.created_at, l.updated_at,
         EXISTS (SELECT 1 FROM leads d WHERE d.phone = l.phone AND d.id <> l.id) AS is_duplicate,
         (SELECT n.content FROM lead_notes n WHERE n.lead_id = l.id ORDER BY n.created_at DESC, n.id DESC LIMIT 1) AS last_note,
         (SELECT n.created_at FROM lead_notes n WHERE n.lead_id = l.id ORDER BY n.created_at DESC, n.id DESC LIMIT 1) AS last_note_at
    FROM leads l
    JOIN lead_statuses s ON s.id = l.status_id
    LEFT JOIN users a ON a.id = l.assignee_id
    LEFT JOIN users c ON c.id = l.created_by`;

/** 기본(신규) 상태 id */
export async function defaultStatusId(db = { query }) {
  const { rows } = await db.query(
    "SELECT id FROM lead_statuses ORDER BY is_default DESC, sort_order ASC LIMIT 1"
  );
  return rows[0].id;
}

export async function statusExists(id) {
  const { rows } = await query("SELECT 1 FROM lead_statuses WHERE id = $1", [id]);
  return rows.length > 0;
}

// ───────── 공통 입력 스키마 ─────────
export const phoneField = z
  .string({ required_error: "연락처를 입력하세요." })
  .transform(digitsOnly)
  .refine(isValidMobile, "휴대폰 번호 형식이 올바르지 않습니다. (예: 010-1234-5678)");

export const leadBaseSchema = z.object({
  name: z.string({ required_error: "이름을 입력하세요." }).trim().min(1, "이름을 입력하세요.").max(50, "이름이 너무 깁니다."),
  phone: phoneField,
  products: z.array(z.enum(PRODUCTS)).min(1, "관심 상품을 1개 이상 선택하세요.").max(PRODUCTS.length)
    .transform((a) => [...new Set(a)]),
  carrier: z.enum(CARRIERS, { errorMap: () => ({ message: "희망 통신사를 선택하세요." }) }),
  callTime: z.string().trim().max(50).optional().default(""),
  message: z.string().trim().max(1000, "문의 내용은 1000자 이내로 입력하세요.").optional().default(""),
});

// ───────── 관리자 목록 필터 (목록·엑셀 다운로드 공용) ─────────
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("").transform(() => undefined));
export const leadFilterSchema = z.object({
  q: z.string().trim().max(50).optional(),
  from: dateStr,
  to: dateStr,
  status: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
  assignee: z.union([z.literal("none"), z.coerce.number().int().positive()]).optional().or(z.literal("").transform(() => undefined)),
  source: z.enum(SOURCES).optional().or(z.literal("").transform(() => undefined)),
  utm: z.string().trim().max(200).optional(),
  unassigned: z.enum(["1", "true", "0", "false", ""]).optional(),
  duplicate: z.enum(["1", "true", "0", "false", ""]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

/** 필터 → WHERE 절 + 파라미터. 날짜는 한국 시간 기준 */
export function buildLeadWhere(f) {
  const where = [];
  const params = [];
  const p = (v) => {
    params.push(v);
    return `$${params.length}`;
  };
  if (f.q) {
    const digits = digitsOnly(f.q);
    const conds = [`l.name ILIKE ${p(`%${f.q}%`)}`];
    if (digits.length >= 3) conds.push(`l.phone LIKE ${p(`%${digits}%`)}`);
    where.push(`(${conds.join(" OR ")})`);
  }
  if (f.from) where.push(`l.created_at >= (${p(f.from)}::date::timestamp AT TIME ZONE 'Asia/Seoul')`);
  if (f.to) where.push(`l.created_at < ((${p(f.to)}::date + 1)::timestamp AT TIME ZONE 'Asia/Seoul')`);
  if (f.status) where.push(`l.status_id = ${p(f.status)}`);
  if (f.assignee === "none" || f.unassigned === "1" || f.unassigned === "true") where.push(`l.assignee_id IS NULL`);
  else if (f.assignee) where.push(`l.assignee_id = ${p(f.assignee)}`);
  if (f.source) where.push(`l.source = ${p(f.source)}`);
  if (f.utm) {
    if (f.utm === "(direct)") where.push(`l.utm_source IS NULL`);
    else where.push(`l.utm_source = ${p(f.utm)}`);
  }
  if (f.duplicate === "1" || f.duplicate === "true") {
    where.push(`EXISTS (SELECT 1 FROM leads d WHERE d.phone = l.phone AND d.id <> l.id)`);
  }
  return { where: where.length ? `WHERE ${where.join(" AND ")}` : "", params };
}
