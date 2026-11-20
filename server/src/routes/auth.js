import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { query } from "../db.js";
import { ah, parse, HttpError } from "../lib/http.js";
import { issueSession, clearSession, requireAuth } from "../middleware/auth.js";
import { logAccess } from "../lib/accessLog.js";

const router = Router();

const MAX_FAILS = 5;
const LOCK_MINUTES = 10;
// 존재하지 않는 아이디에도 비슷한 시간이 걸리도록 비교용 더미 해시
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", 12);

const loginSchema = z.object({
  loginId: z.string().trim().min(1, "아이디를 입력하세요.").max(50),
  password: z.string().min(1, "비밀번호를 입력하세요.").max(200),
});

router.post(
  "/login",
  ah(async (req, res) => {
    const { loginId, password } = parse(loginSchema, req.body);
    const { rows } = await query(
      `SELECT id, login_id, name, role, is_active, password_hash, failed_attempts, locked_until
         FROM users WHERE login_id = $1`,
      [loginId]
    );
    const user = rows[0];
    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      throw new HttpError(401, "아이디 또는 비밀번호가 올바르지 않습니다.");
    }
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const mins = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      throw new HttpError(423, `로그인 5회 실패로 잠겼습니다. ${mins}분 후 다시 시도하세요.`);
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      const fails = user.failed_attempts + 1;
      if (fails >= MAX_FAILS) {
        await query(
          `UPDATE users SET failed_attempts = 0, locked_until = now() + interval '${LOCK_MINUTES} minutes' WHERE id = $1`,
          [user.id]
        );
        await logAccess({ ip: req.ip, user: { id: user.id } }, "login_locked", user.id);
        throw new HttpError(423, `로그인 5회 실패로 ${LOCK_MINUTES}분간 잠겼습니다.`);
      }
      await query("UPDATE users SET failed_attempts = $2 WHERE id = $1", [user.id, fails]);
      throw new HttpError(401, `아이디 또는 비밀번호가 올바르지 않습니다. (${fails}/${MAX_FAILS})`);
    }
    if (!user.is_active) throw new HttpError(401, "비활성화된 계정입니다. 관리자에게 문의하세요.");

    await query("UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = $1", [user.id]);
    issueSession(res, user);
    req.user = user;
    await logAccess(req, "login", user.id);
    res.json({ user: { id: user.id, loginId: user.login_id, name: user.name, role: user.role } });
  })
);

router.post("/logout", (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

router.get(
  "/me",
  requireAuth(),
  ah(async (req, res) => {
    const u = req.user;
    res.json({ user: { id: u.id, loginId: u.login_id, name: u.name, role: u.role } });
  })
);

const pwSchema = z.object({
  currentPassword: z.string().min(1, "현재 비밀번호를 입력하세요."),
  newPassword: z.string().min(8, "새 비밀번호는 8자 이상이어야 합니다.").max(200),
});

router.post(
  "/change-password",
  requireAuth(),
  ah(async (req, res) => {
    const { currentPassword, newPassword } = parse(pwSchema, req.body);
    const { rows } = await query("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);
    if (!(await bcrypt.compare(currentPassword, rows[0].password_hash))) {
      throw new HttpError(400, "현재 비밀번호가 올바르지 않습니다.");
    }
    await query("UPDATE users SET password_hash = $2 WHERE id = $1", [req.user.id, await bcrypt.hash(newPassword, 12)]);
    await logAccess(req, "change_password", req.user.id);
    res.json({ ok: true });
  })
);

export default router;
