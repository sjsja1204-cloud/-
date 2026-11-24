import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { query } from "../db.js";

export const COOKIE_NAME = "dg_session";
const TOKEN_TTL_SEC = 60 * 60 * 12; // 12시간

export function issueSession(res, user) {
  const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: TOKEN_TTL_SEC });
  res.cookie(COOKIE_NAME, token, cookieOptions(TOKEN_TTL_SEC * 1000));
}

export function clearSession(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}

function cookieOptions(maxAge) {
  const sameSite = config.cookieSameSite === "none" ? "none" : config.cookieSameSite === "strict" ? "strict" : "lax";
  return {
    httpOnly: true,
    secure: config.isProd || sameSite === "none",
    sameSite,
    path: "/",
    ...(maxAge ? { maxAge } : {}),
  };
}

/** 로그인돼 있으면 사용자, 아니면 null (공개 API 에서 관리자 여부만 확인할 때. 응답은 건드리지 않음) */
export async function readUser(req) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const { rows } = await query("SELECT id, name, role, is_active FROM users WHERE id = $1", [payload.sub]);
    return rows[0]?.is_active ? rows[0] : null;
  } catch {
    return null;
  }
}

/**
 * 로그인 필수 + 역할 검사. 매 요청마다 DB 에서 사용자 상태를 다시 확인하므로
 * 비활성화/역할 변경이 즉시 반영된다.
 * @param  {...("admin"|"staff")} roles 허용 역할 (비우면 로그인만 확인)
 */
export function requireAuth(...roles) {
  return async (req, res, next) => {
    try {
      const token = req.cookies?.[COOKIE_NAME];
      if (!token) return res.status(401).json({ error: "로그인이 필요합니다." });
      let payload;
      try {
        payload = jwt.verify(token, config.jwtSecret);
      } catch {
        clearSession(res);
        return res.status(401).json({ error: "로그인이 만료되었습니다." });
      }
      const { rows } = await query(
        "SELECT id, login_id, name, role, is_active FROM users WHERE id = $1",
        [payload.sub]
      );
      const user = rows[0];
      if (!user || !user.is_active) {
        clearSession(res);
        return res.status(401).json({ error: "사용할 수 없는 계정입니다." });
      }
      if (roles.length && !roles.includes(user.role)) {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
      req.user = user;
      next();
    } catch (e) {
      next(e);
    }
  };
}
