import { query } from "../db.js";

/**
 * 관리자/직원의 조회·변경·다운로드 기록.
 * 로그 실패가 본 작업을 막지 않도록 에러는 콘솔에만 남긴다.
 */
export async function logAccess(req, action, targetId = null, detail = null, db = null) {
  if (typeof detail === "string") detail = { note: detail }; // detail 컬럼은 JSONB
  try {
    await (db || { query }).query(
      `INSERT INTO access_logs (user_id, action, target_id, detail, ip) VALUES ($1, $2, $3, $4, $5)`,
      [req.user?.id ?? null, action, targetId == null ? null : String(targetId), detail, req.ip]
    );
  } catch (e) {
    console.error("[access_log] 기록 실패", action, e.message);
  }
}
