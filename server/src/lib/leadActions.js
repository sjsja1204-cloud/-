// 관리자·직원이 공통으로 쓰는 DB 변경 동작 (상태 변경, 메모 추가)
import { tx } from "../db.js";
import { HttpError } from "./http.js";

/** 상태 변경 + 이력 기록. 같은 상태면 아무것도 하지 않음 */
export async function changeLeadStatus(leadId, toStatus, userId) {
  return tx(async (c) => {
    const { rows } = await c.query("SELECT status_id FROM leads WHERE id = $1 FOR UPDATE", [leadId]);
    if (!rows[0]) throw new HttpError(404, "DB를 찾을 수 없습니다.");
    const from = rows[0].status_id;
    if (from === toStatus) return { changed: false };
    const st = await c.query("SELECT 1 FROM lead_statuses WHERE id = $1", [toStatus]);
    if (!st.rows[0]) throw new HttpError(400, "존재하지 않는 상태값입니다.");
    await c.query("UPDATE leads SET status_id = $2, updated_at = now() WHERE id = $1", [leadId, toStatus]);
    await c.query(
      "INSERT INTO lead_status_history (lead_id, from_status, to_status, user_id) VALUES ($1,$2,$3,$4)",
      [leadId, from, toStatus, userId]
    );
    return { changed: true, from, to: toStatus };
  });
}

export async function addLeadNote(leadId, userId, content) {
  return tx(async (c) => {
    const { rows } = await c.query(
      `INSERT INTO lead_notes (lead_id, user_id, content) VALUES ($1,$2,$3)
       RETURNING id, lead_id, user_id, content, created_at`,
      [leadId, userId, content]
    );
    await c.query("UPDATE leads SET updated_at = now() WHERE id = $1", [leadId]);
    return rows[0];
  });
}

export async function getLeadNotes(db, leadId) {
  const { rows } = await db.query(
    `SELECT n.id, n.content, n.created_at, n.user_id, u.name AS user_name
       FROM lead_notes n LEFT JOIN users u ON u.id = n.user_id
      WHERE n.lead_id = $1 ORDER BY n.created_at DESC, n.id DESC`,
    [leadId]
  );
  return rows;
}

export async function getLeadStatusHistory(db, leadId) {
  const { rows } = await db.query(
    `SELECT h.id, h.created_at, fs.name AS from_name, ts.name AS to_name, u.name AS user_name
       FROM lead_status_history h
       LEFT JOIN lead_statuses fs ON fs.id = h.from_status
       JOIN lead_statuses ts ON ts.id = h.to_status
       LEFT JOIN users u ON u.id = h.user_id
      WHERE h.lead_id = $1 ORDER BY h.created_at DESC, h.id DESC`,
    [leadId]
  );
  return rows;
}
