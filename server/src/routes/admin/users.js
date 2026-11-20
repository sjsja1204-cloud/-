// 관리자: 직원 관리 (생성/수정/비활성화/비밀번호 초기화/할당량/역할)
import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { query, KST_TODAY } from "../../db.js";
import { ah, parse, HttpError, toInt } from "../../lib/http.js";
import { logAccess } from "../../lib/accessLog.js";

const router = Router();

router.get(
  "/",
  ah(async (req, res) => {
    const { rows } = await query(
      `SELECT u.id, u.login_id, u.name, u.role, u.daily_quota, u.is_active, u.created_at,
              (u.locked_until IS NOT NULL AND u.locked_until > now()) AS is_locked,
              (SELECT count(*)::int FROM leads l
                WHERE l.assignee_id = u.id AND l.assigned_at >= ${KST_TODAY} AND l.source <> 'staff') AS today_assigned
         FROM users u ORDER BY u.is_active DESC, u.role, u.id`
    );
    res.json({ users: rows });
  })
);

const createSchema = z.object({
  loginId: z.string().trim().regex(/^[a-zA-Z0-9_.-]{3,50}$/, "아이디는 영문/숫자/_.- 3~50자"),
  name: z.string().trim().min(1, "이름을 입력하세요.").max(50),
  password: z.string().min(8, "비밀번호는 8자 이상").max(200),
  role: z.enum(["admin", "staff"]).default("staff"),
  dailyQuota: z.number().int().min(0).max(10000).default(0),
});

router.post(
  "/",
  ah(async (req, res) => {
    const d = parse(createSchema, req.body);
    const exists = await query("SELECT 1 FROM users WHERE login_id = $1", [d.loginId]);
    if (exists.rows[0]) throw new HttpError(409, "이미 사용 중인 아이디입니다.");
    const { rows } = await query(
      `INSERT INTO users (login_id, password_hash, name, role, daily_quota)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, login_id, name, role, daily_quota, is_active, created_at`,
      [d.loginId, await bcrypt.hash(d.password, 12), d.name, d.role, d.dailyQuota]
    );
    await logAccess(req, "user_create", rows[0].id, { loginId: d.loginId, role: d.role });
    res.status(201).json({ user: rows[0] });
  })
);

const patchSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  role: z.enum(["admin", "staff"]).optional(),
  dailyQuota: z.number().int().min(0).max(10000).optional(),
  isActive: z.boolean().optional(),
  unlock: z.boolean().optional(),
});

router.patch(
  "/:id",
  ah(async (req, res) => {
    const id = toInt(req.params.id);
    const d = parse(patchSchema, req.body);
    if (id === req.user.id && (d.isActive === false || d.role === "staff")) {
      throw new HttpError(400, "본인 계정은 비활성화하거나 직원으로 변경할 수 없습니다.");
    }
    const sets = [];
    const params = [id];
    const add = (col, v) => {
      params.push(v);
      sets.push(`${col} = $${params.length}`);
    };
    if (d.name !== undefined) add("name", d.name);
    if (d.role !== undefined) add("role", d.role);
    if (d.dailyQuota !== undefined) add("daily_quota", d.dailyQuota);
    if (d.isActive !== undefined) add("is_active", d.isActive);
    if (d.unlock) sets.push("failed_attempts = 0", "locked_until = NULL");
    if (!sets.length) throw new HttpError(400, "변경할 내용이 없습니다.");
    const { rows } = await query(
      `UPDATE users SET ${sets.join(", ")} WHERE id = $1
       RETURNING id, login_id, name, role, daily_quota, is_active, created_at`,
      params
    );
    if (!rows[0]) throw new HttpError(404, "사용자를 찾을 수 없습니다.");
    await logAccess(req, "user_update", id, d);
    res.json({ user: rows[0] });
  })
);

const resetSchema = z.object({ password: z.string().min(8, "비밀번호는 8자 이상").max(200) });
router.post(
  "/:id/reset-password",
  ah(async (req, res) => {
    const id = toInt(req.params.id);
    const { password } = parse(resetSchema, req.body);
    const { rowCount } = await query(
      "UPDATE users SET password_hash = $2, failed_attempts = 0, locked_until = NULL WHERE id = $1",
      [id, await bcrypt.hash(password, 12)]
    );
    if (!rowCount) throw new HttpError(404, "사용자를 찾을 수 없습니다.");
    await logAccess(req, "user_reset_password", id);
    res.json({ ok: true });
  })
);

export default router;
