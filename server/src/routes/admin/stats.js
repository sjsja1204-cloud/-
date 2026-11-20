// 관리자: 간단 통계 (표 형태)
import { Router } from "express";
import { query, KST_TODAY, KST_WEEK } from "../../db.js";
import { ah } from "../../lib/http.js";

const router = Router();

router.get(
  "/",
  ah(async (req, res) => {
    const [summary, byStatus, bySource, byStaff] = await Promise.all([
      query(`SELECT
               count(*) FILTER (WHERE created_at >= ${KST_TODAY})::int AS today,
               count(*) FILTER (WHERE created_at >= ${KST_WEEK})::int  AS week,
               count(*) FILTER (WHERE assignee_id IS NULL)::int         AS unassigned,
               count(*)::int AS total
             FROM leads`),
      query(`SELECT s.id, s.name, count(l.id)::int AS n
               FROM lead_statuses s LEFT JOIN leads l ON l.status_id = s.id
              GROUP BY s.id ORDER BY s.sort_order`),
      query(`SELECT source, count(*) FILTER (WHERE created_at >= ${KST_TODAY})::int AS today,
                    count(*) FILTER (WHERE created_at >= ${KST_WEEK})::int AS week
               FROM leads GROUP BY source ORDER BY source`),
      // 처리 = 오늘 해당 직원이 상태를 변경한 DB 수 / 개통완료 = 오늘 개통완료로 변경한 DB 수
      query(`SELECT u.id, u.name, u.daily_quota, u.is_active,
                    (SELECT count(*)::int FROM leads l WHERE l.assignee_id = u.id AND l.assigned_at >= ${KST_TODAY}) AS assigned_today,
                    (SELECT count(DISTINCT h.lead_id)::int FROM lead_status_history h
                      WHERE h.user_id = u.id AND h.created_at >= ${KST_TODAY}) AS processed_today,
                    (SELECT count(DISTINCT h.lead_id)::int FROM lead_status_history h
                       JOIN lead_statuses s ON s.id = h.to_status
                      WHERE h.user_id = u.id AND h.created_at >= ${KST_TODAY} AND s.name = '개통완료') AS opened_today,
                    (SELECT count(*)::int FROM leads l JOIN lead_statuses s ON s.id = l.status_id
                      WHERE l.assignee_id = u.id AND NOT s.is_final) AS open_total
               FROM users u WHERE u.role = 'staff' ORDER BY u.is_active DESC, u.id`),
    ]);
    res.json({
      summary: summary.rows[0],
      byStatus: byStatus.rows,
      bySource: bySource.rows,
      byStaff: byStaff.rows,
    });
  })
);

export default router;
