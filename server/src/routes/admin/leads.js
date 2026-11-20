// 관리자: DB 목록/검색/상세/수정/메모/엑셀 다운로드/일괄 배정/분배
import { Router } from "express";
import ExcelJS from "exceljs";
import { z } from "zod";
import { query } from "../../db.js";
import { ah, parse, HttpError, toInt } from "../../lib/http.js";
import { LEAD_SELECT, leadFilterSchema, buildLeadWhere } from "../../lib/leadQueries.js";
import { changeLeadStatus, addLeadNote, getLeadNotes, getLeadStatusHistory } from "../../lib/leadActions.js";
import { logAccess } from "../../lib/accessLog.js";
import { formatPhone } from "../../lib/phone.js";
import { distributeUnassigned } from "../../lib/distribute.js";

const router = Router();
const SOURCE_LABEL = { web: "홈페이지", staff: "직원접수", upload: "엑셀업로드" };

// 목록
router.get(
  "/",
  ah(async (req, res) => {
    const f = parse(leadFilterSchema, req.query);
    const { where, params } = buildLeadWhere(f);
    const offset = (f.page - 1) * f.pageSize;
    const [list, count] = await Promise.all([
      query(`${LEAD_SELECT} ${where} ORDER BY l.created_at DESC, l.id DESC LIMIT ${f.pageSize} OFFSET ${offset}`, params),
      query(`SELECT count(*)::int AS n FROM leads l ${where}`, params),
    ]);
    await logAccess(req, "admin_list_leads", null, { filter: req.query });
    res.json({ items: list.rows, total: count.rows[0].n, page: f.page, pageSize: f.pageSize });
  })
);

// 필터용 선택지 (유입경로 목록)
router.get(
  "/filter-options",
  ah(async (req, res) => {
    const { rows } = await query(
      `SELECT utm_source, count(*)::int AS n FROM leads WHERE utm_source IS NOT NULL
        GROUP BY utm_source ORDER BY n DESC LIMIT 100`
    );
    res.json({ utmSources: rows.map((r) => r.utm_source) });
  })
);

// 엑셀 다운로드 (현재 필터 그대로, 페이지네이션 무시)
router.get(
  "/export",
  ah(async (req, res) => {
    const f = parse(leadFilterSchema, req.query);
    const { where, params } = buildLeadWhere(f);
    const { rows } = await query(`${LEAD_SELECT} ${where} ORDER BY l.created_at DESC, l.id DESC LIMIT 50000`, params);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("DB목록");
    ws.columns = [
      { header: "번호", key: "id", width: 8 },
      { header: "접수일시", key: "created_at", width: 18 },
      { header: "이름", key: "name", width: 12 },
      { header: "연락처", key: "phone", width: 16 },
      { header: "관심상품", key: "products", width: 22 },
      { header: "희망통신사", key: "carrier", width: 14 },
      { header: "통화가능시간", key: "call_time", width: 16 },
      { header: "문의내용", key: "message", width: 30 },
      { header: "상태", key: "status_name", width: 10 },
      { header: "담당자", key: "assignee_name", width: 10 },
      { header: "배정일시", key: "assigned_at", width: 18 },
      { header: "출처", key: "source", width: 12 },
      { header: "utm_source", key: "utm_source", width: 14 },
      { header: "utm_medium", key: "utm_medium", width: 14 },
      { header: "utm_campaign", key: "utm_campaign", width: 16 },
      { header: "referrer", key: "referrer", width: 30 },
      { header: "중복", key: "dup", width: 6 },
      { header: "최근메모", key: "last_note", width: 30 },
    ];
    const kst = (d) => (d ? new Date(d).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false }) : "");
    for (const r of rows) {
      ws.addRow({
        ...r,
        created_at: kst(r.created_at),
        assigned_at: kst(r.assigned_at),
        phone: formatPhone(r.phone),
        products: (r.products || []).join(", "),
        source: SOURCE_LABEL[r.source] || r.source,
        dup: r.is_duplicate ? "중복" : "",
      });
    }
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];

    await logAccess(req, "excel_download", null, { filter: req.query, rows: rows.length });
    const stamp = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="leads-${stamp}.xlsx"; filename*=UTF-8''${encodeURIComponent(`담아가넷_DB_${stamp}.xlsx`)}`);
    await wb.xlsx.write(res);
    res.end();
  })
);

// 미배정 DB 분배 실행 (할당량 기반)
router.post(
  "/distribute",
  ah(async (req, res) => {
    const result = await distributeUnassigned();
    await logAccess(req, "distribute", null, result);
    res.json(result);
  })
);

// 수동 일괄 배정 (assigneeId=null 이면 배정 해제)
const assignSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, "배정할 DB를 선택하세요.").max(1000),
  assigneeId: z.number().int().positive().nullable(),
});
router.post(
  "/assign",
  ah(async (req, res) => {
    const { ids, assigneeId } = parse(assignSchema, req.body);
    if (assigneeId) {
      const { rows } = await query("SELECT is_active FROM users WHERE id = $1", [assigneeId]);
      if (!rows[0]?.is_active) throw new HttpError(400, "활성 상태의 직원만 배정할 수 있습니다.");
    }
    const { rowCount } = await query(
      `UPDATE leads SET assignee_id = $2, assigned_at = CASE WHEN $2::int IS NULL THEN NULL ELSE now() END,
              updated_at = now()
        WHERE id = ANY($1::int[])`,
      [ids, assigneeId]
    );
    await logAccess(req, "assign_bulk", assigneeId, { ids, assigneeId });
    res.json({ updated: rowCount });
  })
);

// 상세
router.get(
  "/:id",
  ah(async (req, res) => {
    const id = toInt(req.params.id);
    if (!id) throw new HttpError(400, "잘못된 요청입니다.");
    const { rows } = await query(`${LEAD_SELECT} WHERE l.id = $1`, [id]);
    if (!rows[0]) throw new HttpError(404, "DB를 찾을 수 없습니다.");
    const [notes, history, dups] = await Promise.all([
      getLeadNotes({ query }, id),
      getLeadStatusHistory({ query }, id),
      query(
        `SELECT l.id, l.name, l.created_at, l.source, s.name AS status_name, u.name AS assignee_name
           FROM leads l JOIN lead_statuses s ON s.id = l.status_id LEFT JOIN users u ON u.id = l.assignee_id
          WHERE l.phone = $1 AND l.id <> $2 ORDER BY l.created_at DESC LIMIT 20`,
        [rows[0].phone, id]
      ),
    ]);
    await logAccess(req, "admin_view_lead", id);
    res.json({ lead: rows[0], notes, history, duplicates: dups.rows });
  })
);

// 상태/담당자 변경
const patchSchema = z.object({
  statusId: z.number().int().positive().optional(),
  assigneeId: z.number().int().positive().nullable().optional(),
});
router.patch(
  "/:id",
  ah(async (req, res) => {
    const id = toInt(req.params.id);
    if (!id) throw new HttpError(400, "잘못된 요청입니다.");
    const body = parse(patchSchema, req.body);
    if (body.statusId) {
      const r = await changeLeadStatus(id, body.statusId, req.user.id);
      if (r.changed) await logAccess(req, "status_change", id, r);
    }
    if (body.assigneeId !== undefined) {
      if (body.assigneeId) {
        const { rows } = await query("SELECT is_active FROM users WHERE id = $1", [body.assigneeId]);
        if (!rows[0]?.is_active) throw new HttpError(400, "활성 상태의 직원만 배정할 수 있습니다.");
      }
      const { rowCount } = await query(
        `UPDATE leads SET assignee_id = $2, assigned_at = CASE WHEN $2::int IS NULL THEN NULL ELSE now() END, updated_at = now()
          WHERE id = $1 AND assignee_id IS DISTINCT FROM $2`,
        [id, body.assigneeId]
      );
      if (rowCount) await logAccess(req, "assign", id, { assigneeId: body.assigneeId });
    }
    const { rows } = await query(`${LEAD_SELECT} WHERE l.id = $1`, [id]);
    if (!rows[0]) throw new HttpError(404, "DB를 찾을 수 없습니다.");
    res.json({ lead: rows[0] });
  })
);

const noteSchema = z.object({ content: z.string().trim().min(1, "메모를 입력하세요.").max(2000) });
router.post(
  "/:id/notes",
  ah(async (req, res) => {
    const id = toInt(req.params.id);
    const { content } = parse(noteSchema, req.body);
    const { rows } = await query("SELECT 1 FROM leads WHERE id = $1", [id]);
    if (!rows[0]) throw new HttpError(404, "DB를 찾을 수 없습니다.");
    const note = await addLeadNote(id, req.user.id, content);
    res.status(201).json({ note: { ...note, user_name: req.user.name } });
  })
);

export default router;
