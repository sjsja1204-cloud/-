// 관리자: 엑셀 업로드 (양식 다운로드 → 업로드/검증 → 미리보기 → 확정)
import { Router } from "express";
import multer from "multer";
import ExcelJS from "exceljs";
import { z } from "zod";
import { query, tx } from "../../db.js";
import { ah, parse, HttpError, toInt } from "../../lib/http.js";
import { logAccess } from "../../lib/accessLog.js";
import { getSetting } from "../../lib/settings.js";
import { normalizeExcelPhone, isValidMobile, formatPhone } from "../../lib/phone.js";
import { defaultStatusId } from "../../lib/leadQueries.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, /\.xlsx$/i.test(file.originalname)),
});

const COLUMNS = ["이름", "연락처", "관심상품", "희망통신사", "메모"];
const MAX_ROWS = 5000;

// 흔한 표기 → 표준값
const CARRIER_ALIAS = {
  kt: "KT", "lg u+": "LG U+", "lgu+": "LG U+", lg: "LG U+", "엘지": "LG U+", "유플러스": "LG U+",
  sk: "SK", skt: "SK", "sk브로드밴드": "SK", "skb": "SK", "kt스카이라이프": "KT스카이라이프",
  "스카이라이프": "KT스카이라이프", "상관없음": "상관없음",
};
const PRODUCT_ALIAS = { "인터넷tv": "인터넷+TV", "인터넷+tv": "인터넷+TV", "결합": "결합상품", "휴대폰": "휴대폰", "핸드폰": "휴대폰" };

const cellText = (cell) => {
  if (cell == null || cell.value == null) return "";
  if (typeof cell.value === "number") return String(cell.value);
  return String(cell.text ?? "").trim();
};

// 양식 다운로드
router.get(
  "/template",
  ah(async (req, res) => {
    const { products: PRODUCTS, carriers: CARRIERS } = await getSetting("form_options");
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("업로드양식");
    ws.columns = COLUMNS.map((h) => ({ header: h, key: h, width: h === "메모" ? 40 : 18 }));
    ws.getColumn("연락처").numFmt = "@"; // 텍스트 서식 (앞자리 0 유지)
    ws.addRow({ 이름: "홍길동", 연락처: "010-1234-5678", 관심상품: "인터넷, 휴대폰", 희망통신사: "KT", 메모: "예시 행 — 삭제 후 사용" });
    ws.getRow(1).font = { bold: true };
    const guide = wb.addWorksheet("작성안내");
    guide.addRows([
      ["항목", "설명"],
      ["이름", "필수"],
      ["연락처", "필수, 휴대폰 번호 (하이픈 있어도 됨)"],
      ["관심상품", `선택, 쉼표로 여러 개: ${PRODUCTS.join(" / ")}`],
      ["희망통신사", `선택: ${CARRIERS.join(" / ")}`],
      ["메모", "선택, 메모 이력으로 저장됩니다"],
    ]);
    guide.getColumn(1).width = 14;
    guide.getColumn(2).width = 60;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="upload-template.xlsx"; filename*=UTF-8''${encodeURIComponent("담아가넷_업로드양식.xlsx")}`);
    await wb.xlsx.write(res);
    res.end();
  })
);

// 업로드 → 검증 → 미리보기 (아직 DB 에 저장하지 않음, upload_batches.payload 에 보관)
router.post(
  "/preview",
  upload.single("file"),
  ah(async (req, res) => {
    const { products: PRODUCTS, carriers: CARRIERS } = await getSetting("form_options");
    if (!req.file) throw new HttpError(400, ".xlsx 파일을 선택하세요.");
    const filename = Buffer.from(req.file.originalname, "latin1").toString("utf8");
    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.load(req.file.buffer);
    } catch {
      throw new HttpError(400, "엑셀 파일을 읽을 수 없습니다. 양식(.xlsx)을 확인하세요.");
    }
    const ws = wb.worksheets[0];
    if (!ws) throw new HttpError(400, "시트가 없습니다.");

    // 헤더 위치 찾기
    const header = {};
    ws.getRow(1).eachCell((cell, col) => {
      const t = cellText(cell).replace(/\s/g, "");
      if (COLUMNS.includes(t)) header[t] = col;
    });
    const missing = ["이름", "연락처"].filter((h) => !header[h]);
    if (missing.length) throw new HttpError(400, `필수 컬럼이 없습니다: ${missing.join(", ")} (양식을 다운로드해 사용하세요)`);

    const rows = [];
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const get = (h) => (header[h] ? cellText(row.getCell(header[h])) : "");
      const raw = { name: get("이름"), phone: get("연락처"), products: get("관심상품"), carrier: get("희망통신사"), memo: get("메모") };
      if (!Object.values(raw).some((v) => v)) continue; // 빈 행 무시
      rows.push({ row: r, ...raw });
    }
    if (!rows.length) throw new HttpError(400, "데이터 행이 없습니다.");
    if (rows.length > MAX_ROWS) throw new HttpError(400, `한 번에 최대 ${MAX_ROWS}행까지 업로드할 수 있습니다.`);

    // 행별 검증
    const seen = new Map(); // phone -> 첫 등장 행
    const checked = rows.map((r) => {
      const errors = [];
      const name = r.name.trim();
      if (!name) errors.push("이름 없음");
      else if (name.length > 50) errors.push("이름이 너무 김");
      const phone = normalizeExcelPhone(r.phone);
      if (!r.phone) errors.push("연락처 없음");
      else if (!isValidMobile(phone)) errors.push(`연락처 형식 오류(${r.phone})`);

      const products = [];
      for (const p of r.products.split(/[,/、]/).map((s) => s.trim()).filter(Boolean)) {
        const alias = PRODUCT_ALIAS[p.toLowerCase().replace(/\s/g, "")];
        const std = PRODUCTS.includes(p) ? p : PRODUCTS.includes(alias) ? alias : null;
        if (std) {
          if (!products.includes(std)) products.push(std);
        } else errors.push(`관심상품 값 오류(${p})`);
      }
      let carrier = null;
      if (r.carrier) {
        const alias = CARRIER_ALIAS[r.carrier.toLowerCase().replace(/\s/g, "")];
        carrier = CARRIERS.includes(r.carrier) ? r.carrier : CARRIERS.includes(alias) ? alias : null;
        if (!carrier) errors.push(`희망통신사 값 오류(${r.carrier})`);
      }
      if (r.memo.length > 2000) errors.push("메모가 너무 김(2000자)");

      const item = { row: r.row, name, phone, phoneDisplay: formatPhone(phone) || r.phone, products, carrier, memo: r.memo || null };
      if (errors.length) return { ...item, kind: "error", reason: errors.join(", ") };
      if (seen.has(phone)) return { ...item, kind: "duplicate", reason: `파일 내 중복 (${seen.get(phone)}행)` };
      seen.set(phone, r.row);
      return { ...item, kind: "new" };
    });

    // 기존 DB 와 중복 확인
    const phones = checked.filter((c) => c.kind === "new").map((c) => c.phone);
    if (phones.length) {
      const { rows: existing } = await query(
        "SELECT phone, min(id) AS id FROM leads WHERE phone = ANY($1::text[]) GROUP BY phone",
        [phones]
      );
      const map = new Map(existing.map((e) => [e.phone, e.id]));
      for (const c of checked) {
        if (c.kind === "new" && map.has(c.phone)) {
          c.kind = "duplicate";
          c.reason = `기존 DB 있음 (#${map.get(c.phone)})`;
        }
      }
    }

    const count = (k) => checked.filter((c) => c.kind === k).length;
    const summary = { total: checked.length, new: count("new"), duplicate: count("duplicate"), error: count("error") };
    const { rows: batch } = await query(
      `INSERT INTO upload_batches (filename, total, duplicated, errors, state, payload, uploaded_by)
       VALUES ($1,$2,$3,$4,'pending',$5,$6) RETURNING id`,
      [filename, summary.total, summary.duplicate, summary.error, JSON.stringify(checked), req.user.id]
    );
    await logAccess(req, "excel_upload_preview", batch[0].id, { filename, ...summary });
    res.json({
      batchId: batch[0].id,
      filename,
      summary,
      errors: checked.filter((c) => c.kind === "error"),
      duplicates: checked.filter((c) => c.kind === "duplicate"),
      sample: checked.filter((c) => c.kind === "new").slice(0, 20),
    });
  })
);

// 확정 → 저장 (신규만, includeDuplicates=true 면 중복도 저장. 오류 행은 항상 제외)
// TODO(확인필요): 중복 행 기본 처리 방식 (현재: 기본 제외, 체크 시 포함)
const confirmSchema = z.object({ includeDuplicates: z.boolean().default(false) });
router.post(
  "/:id/confirm",
  ah(async (req, res) => {
    const id = toInt(req.params.id);
    const { includeDuplicates } = parse(confirmSchema, req.body || {});
    const result = await tx(async (c) => {
      const { rows } = await c.query("SELECT * FROM upload_batches WHERE id = $1 FOR UPDATE", [id]);
      const batch = rows[0];
      if (!batch) throw new HttpError(404, "업로드 내역을 찾을 수 없습니다.");
      if (batch.state !== "pending") throw new HttpError(409, "이미 처리된 업로드입니다.");
      const items = (batch.payload || []).filter((r) => r.kind === "new" || (includeDuplicates && r.kind === "duplicate"));
      const statusId = await defaultStatusId(c);
      let inserted = 0;
      for (const r of items) {
        const { rows: ins } = await c.query(
          `INSERT INTO leads (name, phone, products, carrier, source, status_id, created_by, upload_batch_id)
           VALUES ($1,$2,$3,$4,'upload',$5,$6,$7) RETURNING id`,
          [r.name, r.phone, r.products, r.carrier, statusId, req.user.id, id]
        );
        if (r.memo) {
          await c.query("INSERT INTO lead_notes (lead_id, user_id, content) VALUES ($1,$2,$3)", [ins[0].id, req.user.id, r.memo]);
        }
        inserted++;
      }
      await c.query(
        "UPDATE upload_batches SET state = 'confirmed', inserted = $2, payload = NULL WHERE id = $1",
        [id, inserted]
      );
      return { inserted, skipped: batch.total - inserted };
    });
    await logAccess(req, "excel_upload_confirm", id, { ...result, includeDuplicates });
    res.json(result);
  })
);

router.post(
  "/:id/cancel",
  ah(async (req, res) => {
    const id = toInt(req.params.id);
    const { rowCount } = await query(
      "UPDATE upload_batches SET state = 'cancelled', payload = NULL WHERE id = $1 AND state = 'pending'",
      [id]
    );
    if (rowCount) await logAccess(req, "excel_upload_cancel", id);
    res.json({ ok: true });
  })
);

router.get(
  "/batches",
  ah(async (req, res) => {
    const { rows } = await query(
      `SELECT b.id, b.filename, b.total, b.inserted, b.duplicated, b.errors, b.state, b.created_at, u.name AS uploaded_by_name
         FROM upload_batches b LEFT JOIN users u ON u.id = b.uploaded_by
        ORDER BY b.id DESC LIMIT 30`
    );
    res.json({ batches: rows });
  })
);

export default router;
