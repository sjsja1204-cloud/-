// DB 분배 (단순 버전)
// 미배정 DB 를 오래된 순으로, 활성 직원들의 '오늘 남은 할당량' 만큼 돌아가며(라운드로빈) 배정한다.
// 2차 범위(자동 cron 분배, 자동 회수)는 이 함수를 스케줄러에서 호출하는 식으로 붙이면 된다.
import { tx, KST_TODAY } from "../db.js";

export async function distributeUnassigned() {
  return tx(async (c) => {
    // 동시에 두 번 눌러도 중복 배정되지 않도록 트랜잭션 단위 잠금
    await c.query("SELECT pg_advisory_xact_lock(424242)");

    // 오늘(한국시간) 이미 배정받은 건수 — 직원 본인이 직접 접수한 건(source=staff)은 할당량에서 제외
    // TODO(확인필요): 직원 직접 접수 건을 할당량에 포함할지 여부
    const { rows: staff } = await c.query(
      `SELECT u.id, u.name, u.daily_quota,
              (SELECT count(*)::int FROM leads l
                WHERE l.assignee_id = u.id AND l.assigned_at >= ${KST_TODAY} AND l.source <> 'staff') AS today_count
         FROM users u
        WHERE u.role = 'staff' AND u.is_active AND u.daily_quota > 0
        ORDER BY u.id`
    );
    const slots = staff
      .map((s) => ({ ...s, remaining: Math.max(0, s.daily_quota - s.today_count), assigned: 0 }))
      .filter((s) => s.remaining > 0);
    const capacity = slots.reduce((a, s) => a + s.remaining, 0);
    if (!capacity) return { assigned: 0, unassignedLeft: await countUnassigned(c), perStaff: [] , message: "남은 할당량이 있는 활성 직원이 없습니다." };

    const { rows: leads } = await c.query(
      `SELECT id FROM leads WHERE assignee_id IS NULL ORDER BY created_at ASC, id ASC LIMIT $1 FOR UPDATE SKIP LOCKED`,
      [capacity]
    );

    // 라운드로빈: 남은 할당량이 있는 직원에게 차례대로 1건씩
    const plan = new Map(); // staffId -> leadIds[]
    let i = 0;
    for (const lead of leads) {
      let tries = 0;
      while (slots[i % slots.length].remaining === 0 && tries < slots.length) {
        i++;
        tries++;
      }
      const s = slots[i % slots.length];
      if (s.remaining === 0) break;
      s.remaining--;
      s.assigned++;
      if (!plan.has(s.id)) plan.set(s.id, []);
      plan.get(s.id).push(lead.id);
      i++;
    }

    for (const [staffId, ids] of plan) {
      await c.query(
        `UPDATE leads SET assignee_id = $1, assigned_at = now(), updated_at = now() WHERE id = ANY($2::int[])`,
        [staffId, ids]
      );
    }
    const assigned = slots.reduce((a, s) => a + s.assigned, 0);
    return {
      assigned,
      unassignedLeft: await countUnassigned(c),
      perStaff: slots.map((s) => ({ id: s.id, name: s.name, assigned: s.assigned, remaining: s.remaining })),
    };
  });
}

async function countUnassigned(c) {
  const { rows } = await c.query("SELECT count(*)::int AS n FROM leads WHERE assignee_id IS NULL");
  return rows[0].n;
}
