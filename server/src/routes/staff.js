// 직원용 API — 본인에게 배정된 DB 만 접근 가능. 연락처는 서버에서 마스킹해서 내려준다.
import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";
import { ah, parse, HttpError, toInt } from "../lib/http.js";
import { LEAD_SELECT, leadBaseSchema, defaultStatusId } from "../lib/leadQueries.js";
import { changeLeadStatus, addLeadNote, getLeadNotes, getLeadStatusHistory } from "../lib/leadActions.js";
import { logAccess } from "../lib/accessLog.js";
import { maskPhone, formatPhone } from "../lib/phone.js";

const router = Router();

/** 직원에게 내려줄 형태: 원본 phone 제거, 마스킹 값만 */
function toStaffLead(l) {
  const { phone, ip, referrer, utm_source, utm_medium, utm_campaign, upload_batch_id, ...rest } = l;
  return { ...rest, phone_masked: maskPhone(phone) };
}

/** 본인 DB 인지 확인. 없으면 404, 남의 것이면 403 */
async function loadOwnLead(req) {
  const id = toInt(req.params.id);
  if (!id) throw new HttpError(400, "잘못된 요청입니다.");
  const { rows } = await query(`${LEAD_SELECT} WHERE l.id = $1`, [id]);
  const lead = rows[0];
  if (!lead) throw new HttpError(404, "DB를 찾을 수 없습니다.");
  if (lead.assignee_id !== req.user.id) {
    await logAccess(req, "staff_forbidden", id);
    throw new HttpError(403, "본인에게 배정된 DB만 볼 수 있습니다.");
  }
  return lead;
}

// 내 DB 목록. date=today(기본)|all|YYYY-MM-DD (배정일 기준, 한국시간), status=상태id
const listSchema = z.object({
  date: z.union([z.enum(["today", "all"]), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).default("today"),
  status: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
});
router.get(
  "/leads",
  ah(async (req, res) => {
    const f = parse(listSchema, req.query);
    const params = [req.user.id];
    const where = ["l.assignee_id = $1"];
    if (f.date !== "all") {
      if (f.date === "today") {
        where.push(`l.assigned_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul')`);
      } else {
        params.push(f.date);
        where.push(`l.assigned_at >= ($${params.length}::date::timestamp AT TIME ZONE 'Asia/Seoul')
                AND l.assigned_at < (($${params.length}::date + 1)::timestamp AT TIME ZONE 'Asia/Seoul')`);
      }
    }
    if (f.status) {
      params.push(f.status);
      where.push(`l.status_id = $${params.length}`);
    }
    const { rows } = await query(
      `${LEAD_SELECT} WHERE ${where.join(" AND ")} ORDER BY s.is_final ASC, l.assigned_at DESC, l.id DESC LIMIT 500`,
      params
    );
    res.json({ items: rows.map(toStaffLead) });
  })
);

// 직원 직접 접수 (전화 문의 고객) → 출처 staff, 본인에게 자동 배정
const staffCreateSchema = leadBaseSchema.extend({
  memo: z.string().trim().max(2000).optional().default(""),
  consent: z.literal(true, { errorMap: () => ({ message: "고객의 개인정보 수집·이용 동의를 확인해 주세요." }) }),
});
router.post(
  "/leads",
  ah(async (req, res) => {
    const d = parse(staffCreateSchema, req.body);
    const statusId = await defaultStatusId();
    const { rows } = await query(
      `INSERT INTO leads (name, phone, products, carrier, call_time, message, source, status_id,
                          assignee_id, assigned_at, created_by, consent_at, ip)
       VALUES ($1,$2,$3,$4,$5,$6,'staff',$7,$8, now(), $8, now(), $9) RETURNING id`,
      [d.name, d.phone, d.products, d.carrier, d.callTime || null, d.message || null, statusId, req.user.id, req.ip]
    );
    const id = rows[0].id;
    if (d.memo) await addLeadNote(id, req.user.id, d.memo);
    await logAccess(req, "staff_create_lead", id);
    const { rows: out } = await query(`${LEAD_SELECT} WHERE l.id = $1`, [id]);
    res.status(201).json({ lead: toStaffLead(out[0]) });
  })
);

router.get(
  "/leads/:id",
  ah(async (req, res) => {
    const lead = await loadOwnLead(req);
    const [notes, history] = await Promise.all([getLeadNotes({ query }, lead.id), getLeadStatusHistory({ query }, lead.id)]);
    await logAccess(req, "staff_view_lead", lead.id);
    res.json({ lead: toStaffLead(lead), notes, history });
  })
);

// 전화걸기용 원본 번호 (1건씩, 접근 기록)
router.post(
  "/leads/:id/phone",
  ah(async (req, res) => {
    const lead = await loadOwnLead(req);
    await logAccess(req, "staff_reveal_phone", lead.id);
    res.json({ phone: lead.phone, display: formatPhone(lead.phone) });
  })
);

const statusSchema = z.object({ statusId: z.number().int().positive() });
router.patch(
  "/leads/:id/status",
  ah(async (req, res) => {
    const lead = await loadOwnLead(req);
    const { statusId } = parse(statusSchema, req.body);
    const r = await changeLeadStatus(lead.id, statusId, req.user.id);
    if (r.changed) await logAccess(req, "status_change", lead.id, r);
    const { rows } = await query(`${LEAD_SELECT} WHERE l.id = $1`, [lead.id]);
    res.json({ lead: toStaffLead(rows[0]) });
  })
);

const noteSchema = z.object({ content: z.string().trim().min(1, "메모를 입력하세요.").max(2000) });
router.post(
  "/leads/:id/notes",
  ah(async (req, res) => {
    const lead = await loadOwnLead(req);
    const { content } = parse(noteSchema, req.body);
    const note = await addLeadNote(lead.id, req.user.id, content);
    res.status(201).json({ note: { ...note, user_name: req.user.name } });
  })
);

export default router;
