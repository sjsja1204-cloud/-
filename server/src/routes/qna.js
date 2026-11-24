// 고객센터 질문/답변 게시판 — 공개 API(로그인 없이 작성·비밀번호로 열람/수정/삭제) + 관리자·직원 API
// 연락처(phone)·비밀번호 해시·IP 는 공개 API 에서 절대 SELECT 하지 않는다.
import { createHash } from "node:crypto";
import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { query, tx } from "../db.js";
import { ah, parse, HttpError, toInt } from "../lib/http.js";
import { logAccess } from "../lib/accessLog.js";
import { getSetting } from "../lib/settings.js";
import { digitsOnly, isValidMobile, maskPhone } from "../lib/phone.js";
import { defaultStatusId } from "../lib/leadQueries.js";
import { notifyNewQna } from "../lib/telegram.js";
import { readUser } from "../middleware/auth.js";
import { config } from "../config.js";
import { maskName } from "./reviewsFaq.js";

export const QNA_STATUSES = ["waiting", "answered", "review", "hidden"];
const PUBLIC_PAGE = 20;
const RATE_WINDOW_MIN = 10;
const RATE_MAX = 3;
const PW_MAX_FAILS = 5;

// ───────── 공통 도우미 ─────────
/** 본문·제목 속 전화번호 → 010-****-1234 (공개 화면용) */
export const maskPhones = (s) =>
  String(s ?? "").replace(/(?<!\d)(0\d{1,2})[-.\s]?(\d{3,4})[-.\s]?(\d{4})(?!\d)/g, (_, a, b, c) => `${a}-****-${c}`);
/** 링크가 들어 있으면 검토중으로 */
export const hasLink = (s) =>
  /(https?:\/\/|www\.)\S|[a-z0-9-]+\.(com|net|org|kr|io|me|ly|xyz|shop|site|top|info|biz|link|gg|co|to|cc|app)(?![a-z])/i.test(String(s ?? ""));
const squash = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, "");
const findBanned = (words, ...texts) => {
  const t = squash(texts.join("\n"));
  return (words || []).find((w) => squash(w) && t.includes(squash(w)));
};
export const normIp = (ip) => String(ip || "").replace(/^::ffff:/, "");
const like = (q) => `%${q.replace(/[\\%_]/g, "\\$&")}%`;
const VISIBLE = "p.status IN ('waiting','answered')";

async function isBlocked(ip) {
  const { rows } = await query("SELECT 1 FROM blocked_ips WHERE ip = $1", [normIp(ip)]);
  return rows.length > 0;
}

async function verifyTurnstile(token, ip) {
  if (!config.turnstile.enabled) return true;
  if (!token) return false;
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: config.turnstile.secretKey, response: token, remoteip: normIp(ip) }),
      signal: AbortSignal.timeout(5000),
    });
    return (await r.json()).success === true;
  } catch (e) {
    console.error("[turnstile] 확인 실패", e.message);
    return false;
  }
}

const POST_COLS = `p.id, p.author_name, p.title, p.content, p.is_secret, p.is_notice, p.status, p.view_count,
  to_char(p.created_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS day, p.created_at,
  p.created_at > now() - interval '24 hours' AS is_new,
  (SELECT count(*)::int FROM qna_answers a WHERE a.post_id = p.id) AS answer_count`;

const listItem = (r) => ({
  id: r.id,
  title: maskPhones(r.title),
  author: r.is_notice ? r.author_name : maskName(r.author_name),
  date: r.day,
  views: r.view_count,
  status: r.status,
  isSecret: r.is_secret,
  isNotice: r.is_notice,
  answers: r.answer_count,
  isNew: r.is_new,
});

async function answersOf(postId) {
  const { rows } = await query(
    `SELECT id, content, to_char(created_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD HH24:MI') AS at
       FROM qna_answers WHERE post_id = $1 ORDER BY created_at, id`, [postId]);
  return rows.map((a) => ({ id: a.id, content: a.content, date: a.at }));
}

async function fullPost(r) {
  const answers = await answersOf(r.id);
  return { ...listItem(r), content: maskPhones(r.content), answers, canEdit: !r.is_notice && answers.length === 0 };
}

/** 작성자 비밀번호 확인. 5회 틀리면 10분 잠금 */
async function checkPassword(id, password) {
  const { rows } = await query(
    "SELECT id, password_hash, pw_fails, pw_locked_until > now() AS locked, is_notice, status FROM qna_posts WHERE id = $1", [id]);
  const p = rows[0];
  if (!p || p.is_notice || !p.password_hash) throw new HttpError(404, "글을 찾을 수 없습니다.");
  if (p.locked) throw new HttpError(429, "비밀번호를 5번 틀려 10분 동안 잠겼습니다. 잠시 후 다시 시도해 주세요.");
  if (!(await bcrypt.compare(String(password || ""), p.password_hash))) {
    const { rows: u } = await query(
      `UPDATE qna_posts SET
          pw_locked_until = CASE WHEN pw_fails + 1 >= ${PW_MAX_FAILS} THEN now() + interval '10 minutes' ELSE pw_locked_until END,
          pw_fails = CASE WHEN pw_fails + 1 >= ${PW_MAX_FAILS} THEN 0 ELSE pw_fails + 1 END
        WHERE id = $1 RETURNING pw_fails, pw_locked_until > now() AS locked`, [id]);
    if (u[0].locked) throw new HttpError(429, "비밀번호를 5번 틀려 10분 동안 잠겼습니다. 잠시 후 다시 시도해 주세요.");
    throw new HttpError(403, `비밀번호가 맞지 않습니다. (${PW_MAX_FAILS - u[0].pw_fails}번 남음)`);
  }
  if (p.pw_fails) await query("UPDATE qna_posts SET pw_fails = 0 WHERE id = $1", [id]);
  return p;
}

/** 관리자(또는 답변 권한 켜진 직원)인지 — 비밀글 바로 열람용 */
async function canManage(req) {
  const u = await readUser(req);
  if (!u) return false;
  if (u.role === "admin") return true;
  return u.role === "staff" && (await getSetting("qna")).staffAnswer === true;
}

/** 같은 브라우저 하루 1회만 조회수 증가 (익명 쿠키) */
async function countView(req, res, postId) {
  let vid = req.cookies?.dg_vid;
  if (!/^[a-f0-9]{32}$/.test(vid || "")) {
    // 첫 방문: IP+브라우저로 정해서 쿠키가 생기기 전 동시에 온 요청도 한 번만 센다
    vid = createHash("sha256").update(`${normIp(req.ip)}|${req.get("user-agent") || ""}|${config.jwtSecret}`).digest("hex").slice(0, 32);
    const sameSite = config.cookieSameSite === "none" ? "none" : "lax";
    res.cookie("dg_vid", vid, { httpOnly: true, sameSite, secure: config.isProd || sameSite === "none", path: "/", maxAge: 365 * 864e5 });
  }
  const ins = await query(
    "INSERT INTO qna_views (post_id, viewer, day) VALUES ($1, $2, (now() AT TIME ZONE 'Asia/Seoul')::date) ON CONFLICT DO NOTHING", [postId, vid]);
  if (ins.rowCount) {
    await query("UPDATE qna_posts SET view_count = view_count + 1 WHERE id = $1", [postId]);
    if (Math.random() < 0.02) query("DELETE FROM qna_views WHERE day < (now() AT TIME ZONE 'Asia/Seoul')::date - 2").catch(() => {});
  }
  return ins.rowCount > 0;
}

// ───────── 공개 ─────────
export const publicQnaRouter = Router();

const listSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  sort: z.enum(["latest", "views"]).default("latest"),
  field: z.enum(["title", "content", "author"]).default("title"),
  q: z.string().trim().max(50).optional().default(""),
});

publicQnaRouter.get("/qna", ah(async (req, res) => {
  const f = parse(listSchema, req.query);
  const where = [VISIBLE, "NOT p.is_notice"];
  const args = [];
  if (f.q) {
    args.push(like(f.q));
    const n = `$${args.length}`;
    // 비밀글 본문은 검색되지 않게 (검색 결과로 내용을 추측할 수 없도록)
    where.push(f.field === "title" ? `p.title ILIKE ${n}` : f.field === "author" ? `p.author_name ILIKE ${n}` : `(NOT p.is_secret AND p.content ILIKE ${n})`);
  }
  const w = where.join(" AND ");
  const order = f.sort === "views" ? "p.view_count DESC, p.id DESC" : "p.id DESC";
  const [list, total, notices] = await Promise.all([
    query(`SELECT ${POST_COLS} FROM qna_posts p WHERE ${w} ORDER BY ${order} LIMIT ${PUBLIC_PAGE} OFFSET ${(f.page - 1) * PUBLIC_PAGE}`, args),
    query(`SELECT count(*)::int AS n FROM qna_posts p WHERE ${w}`, args),
    query(`SELECT ${POST_COLS} FROM qna_posts p WHERE ${VISIBLE} AND p.is_notice ORDER BY p.id DESC LIMIT 10`),
  ]);
  res.set("Cache-Control", "no-store");
  res.json({ items: list.rows.map(listItem), total: total.rows[0].n, pageSize: PUBLIC_PAGE, notices: notices.rows.map(listItem) });
}));

async function visiblePost(id) {
  if (!id) throw new HttpError(404, "글을 찾을 수 없습니다.");
  const { rows } = await query(`SELECT ${POST_COLS} FROM qna_posts p WHERE p.id = $1 AND ${VISIBLE}`, [id]);
  if (!rows[0]) throw new HttpError(404, "글을 찾을 수 없거나 비공개 상태입니다.");
  return rows[0];
}

publicQnaRouter.get("/qna/:id", ah(async (req, res) => {
  const r = await visiblePost(toInt(req.params.id));
  if (await countView(req, res, r.id)) r.view_count += 1;
  res.set("Cache-Control", "no-store");
  if (r.is_secret && !(await canManage(req))) {
    // 비밀글: 제목 등 목록 정보만. 본문·답변은 비밀번호 확인 후 (/unlock)
    return res.json({ post: { ...listItem(r), locked: true } });
  }
  res.json({ post: await fullPost(r) });
}));

const pwSchema = z.object({ password: z.string({ required_error: "비밀번호를 입력하세요." }).min(1, "비밀번호를 입력하세요.").max(50) });

publicQnaRouter.post("/qna/:id/unlock", ah(async (req, res) => {
  const r = await visiblePost(toInt(req.params.id));
  const { password } = parse(pwSchema, req.body);
  await checkPassword(r.id, password);
  res.set("Cache-Control", "no-store");
  res.json({ post: await fullPost(r) });
}));

const textFields = {
  title: z.string({ required_error: "제목을 입력하세요." }).trim().min(1, "제목을 입력하세요.").max(100, "제목은 100자 이내로 입력하세요."),
  content: z.string({ required_error: "내용을 입력하세요." }).trim().min(1, "내용을 입력하세요.").max(5000, "내용은 5000자 이내로 입력하세요."),
  isSecret: z.boolean().default(true),
};
const writeSchema = z.object({
  name: z.string({ required_error: "이름을 입력하세요." }).trim().min(1, "이름을 입력하세요.").max(30, "이름은 30자 이내로 입력하세요."),
  password: z.string({ required_error: "비밀번호를 입력하세요." }).min(4, "비밀번호는 4자 이상 입력하세요.").max(50, "비밀번호는 50자 이내로 입력하세요."),
  phone: z.string().max(20).optional().default("").transform(digitsOnly)
    .refine((v) => !v || isValidMobile(v), "연락처는 휴대폰 번호 형식으로 입력하세요. (예: 010-1234-5678)"),
  ...textFields,
  consent: z.literal(true, { errorMap: () => ({ message: "개인정보 수집·이용에 동의해 주세요." }) }),
  turnstileToken: z.string().max(4096).optional().default(""),
});

async function assertCanWrite(req, texts) {
  if (await isBlocked(req.ip)) throw new HttpError(403, "이 접속에서는 글을 등록할 수 없습니다. 상담 신청이나 전화로 문의해 주세요.");
  const { bannedWords } = await getSetting("qna");
  if (findBanned(bannedWords, ...texts)) throw new HttpError(400, "등록할 수 없는 단어가 포함되어 있습니다. 내용을 고쳐 주세요.");
}

publicQnaRouter.post("/qna", ah(async (req, res) => {
  // honeypot: 봇이 눈치채지 못하게 성공처럼 응답하고 저장하지 않음
  if (typeof req.body?.website === "string" && req.body.website.trim() !== "") {
    console.warn("[qna honeypot] 차단", req.ip);
    return res.status(201).json({ ok: true, id: null, status: "waiting" });
  }
  if (await isBlocked(req.ip)) throw new HttpError(403, "이 접속에서는 글을 등록할 수 없습니다. 상담 신청이나 전화로 문의해 주세요.");
  const d = parse(writeSchema, req.body);
  if (!(await verifyTurnstile(d.turnstileToken, req.ip))) throw new HttpError(400, "자동 등록 방지 확인에 실패했습니다. 확인란을 다시 체크해 주세요.");
  const ip = normIp(req.ip);
  const recent = await query(`SELECT count(*)::int AS n FROM qna_posts WHERE ip = $1 AND created_at > now() - interval '${RATE_WINDOW_MIN} minutes'`, [ip]);
  if (recent.rows[0].n >= RATE_MAX) throw new HttpError(429, `글은 ${RATE_WINDOW_MIN}분에 ${RATE_MAX}개까지 등록할 수 있습니다. 잠시 후 다시 시도해 주세요.`);
  await assertCanWrite(req, [d.name, d.title, d.content]);
  const status = hasLink(d.title) || hasLink(d.content) ? "review" : "waiting";
  const { rows } = await query(
    `INSERT INTO qna_posts (author_name, password_hash, phone, title, content, is_secret, status, ip, consent_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now()) RETURNING id, title, is_secret, status, phone IS NOT NULL AS has_phone`,
    [d.name, await bcrypt.hash(d.password, 10), d.phone || null, d.title, d.content, d.isSecret, status, ip]
  );
  const p = rows[0];
  notifyNewQna({ ...p, phone: p.has_phone }); // 응답을 기다리게 하지 않음
  res.status(201).json({ ok: true, id: p.id, status });
}));

publicQnaRouter.put("/qna/:id", ah(async (req, res) => {
  const id = toInt(req.params.id);
  const d = parse(pwSchema.extend(textFields), req.body);
  const p = await checkPassword(id, d.password);
  if (p.status === "hidden") throw new HttpError(404, "글을 찾을 수 없거나 비공개 상태입니다.");
  const n = (await query("SELECT count(*)::int AS n FROM qna_answers WHERE post_id = $1", [id])).rows[0].n;
  if (n) throw new HttpError(409, "답변이 달린 글은 수정할 수 없습니다. (삭제는 가능해요)");
  await assertCanWrite(req, [d.title, d.content]);
  const status = hasLink(d.title) || hasLink(d.content) ? "review" : "waiting";
  await query("UPDATE qna_posts SET title = $2, content = $3, is_secret = $4, status = $5, updated_at = now() WHERE id = $1",
    [id, d.title, d.content, d.isSecret, status]);
  res.json({ ok: true, status });
}));

publicQnaRouter.delete("/qna/:id", ah(async (req, res) => {
  const id = toInt(req.params.id);
  const { password } = parse(pwSchema, req.body || {});
  await checkPassword(id, password);
  await query("DELETE FROM qna_posts WHERE id = $1", [id]);
  res.json({ ok: true });
}));

// ───────── 관리자 · 직원(답변 권한) ─────────
const answerSchema = z.object({ content: z.string().trim().min(1, "답변 내용을 입력하세요.").max(5000, "답변은 5000자 이내로 입력하세요.") });
const noticeSchema = z.object({ ...textFields, isSecret: z.boolean().default(false) });
const ipSchema = z.object({
  ip: z.string().trim().min(3, "IP 를 입력하세요.").max(64).regex(/^[0-9a-fA-F:.]+$/, "IP 형식이 올바르지 않습니다.").transform(normIp),
  reason: z.string().trim().max(200).optional().default(""),
});

/** admin=true: 관리자 전체 기능 / false: 직원 — 목록·보기·답변 작성·수정만 (연락처는 가림, IP 숨김) */
export function qnaManageRouter({ admin }) {
  const r = Router();

  if (!admin) {
    r.get("/access", ah(async (req, res) => res.json({ allowed: (await getSetting("qna")).staffAnswer === true })));
    r.use(ah(async (req, res, next) => {
      if (!(await getSetting("qna")).staffAnswer) throw new HttpError(403, "질문/답변 답변 권한이 꺼져 있습니다. 관리자에게 문의하세요.");
      next();
    }));
  }

  const shape = (p) => ({
    ...p,
    phone: p.phone ? (admin ? p.phone : maskPhone(p.phone)) : null,
    ip: admin ? p.ip : undefined,
  });

  r.get("/", ah(async (req, res) => {
    const f = parse(z.object({
      status: z.enum([...QNA_STATUSES, "notice", ""]).optional().default(""),
      secret: z.enum(["1", "0", ""]).optional().default(""),
      q: z.string().trim().max(50).optional().default(""),
      page: z.coerce.number().int().min(1).default(1),
    }), req.query);
    const where = [];
    const args = [];
    const p = (v) => { args.push(v); return `$${args.length}`; };
    if (f.status === "notice") where.push("p.is_notice");
    else if (f.status) where.push(`p.status = ${p(f.status)} AND NOT p.is_notice`);
    if (f.secret) where.push(f.secret === "1" ? "p.is_secret" : "NOT p.is_secret");
    if (f.q) {
      const n = p(like(f.q));
      const conds = [`p.title ILIKE ${n}`, `p.content ILIKE ${n}`, `p.author_name ILIKE ${n}`];
      const digits = digitsOnly(f.q);
      if (admin && digits.length >= 4) conds.push(`p.phone LIKE ${p(`%${digits}%`)}`);
      where.push(`(${conds.join(" OR ")})`);
    }
    const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const size = 30;
    const [list, total, counts] = await Promise.all([
      query(`SELECT p.id, p.title, p.author_name, p.phone, p.is_secret, p.is_notice, p.status, p.view_count, p.ip, p.lead_id, p.created_at,
                    (SELECT count(*)::int FROM qna_answers a WHERE a.post_id = p.id) AS answer_count
               FROM qna_posts p ${w} ORDER BY p.is_notice DESC, p.id DESC LIMIT ${size} OFFSET ${(f.page - 1) * size}`, args),
      query(`SELECT count(*)::int AS n FROM qna_posts p ${w}`, args),
      query(`SELECT CASE WHEN is_notice THEN 'notice' ELSE status END AS k, count(*)::int AS n FROM qna_posts GROUP BY 1`),
    ]);
    res.set("Cache-Control", "no-store");
    res.json({
      items: list.rows.map(shape), total: total.rows[0].n, pageSize: size,
      counts: Object.fromEntries(counts.rows.map((x) => [x.k, x.n])),
    });
  }));

  r.get("/:id(\\d+)", ah(async (req, res) => {
    const id = toInt(req.params.id);
    const { rows } = await query(
      `SELECT p.id, p.title, p.content, p.author_name, p.phone, p.is_secret, p.is_notice, p.status, p.view_count, p.ip,
              p.lead_id, p.author_id, p.created_at, p.updated_at,
              (SELECT count(*)::int FROM leads l WHERE p.phone IS NOT NULL AND l.phone = p.phone) AS phone_leads
         FROM qna_posts p WHERE p.id = $1`, [id]);
    if (!rows[0]) throw new HttpError(404, "글을 찾을 수 없습니다.");
    const answers = (await query(
      `SELECT a.id, a.content, a.created_at, a.updated_at, a.user_id, u.name AS user_name
         FROM qna_answers a LEFT JOIN users u ON u.id = a.user_id WHERE a.post_id = $1 ORDER BY a.created_at, a.id`, [id])).rows;
    await logAccess(req, "qna_view", id);
    res.set("Cache-Control", "no-store");
    res.json({ post: shape(rows[0]), answers });
  }));

  r.post("/:id(\\d+)/answers", ah(async (req, res) => {
    const id = toInt(req.params.id);
    const { content } = parse(answerSchema, req.body);
    const out = await tx(async (c) => {
      const p = (await c.query("SELECT id, status FROM qna_posts WHERE id = $1 FOR UPDATE", [id])).rows[0];
      if (!p) throw new HttpError(404, "글을 찾을 수 없습니다.");
      const a = await c.query("INSERT INTO qna_answers (post_id, user_id, content) VALUES ($1,$2,$3) RETURNING id", [id, req.user.id, content]);
      // 답변대기 → 답변완료 (검토중·숨김 글은 상태 그대로: 승인/숨김 해제 때 답변완료로)
      await c.query("UPDATE qna_posts SET status = 'answered', updated_at = now() WHERE id = $1 AND status = 'waiting'", [id]);
      return a.rows[0];
    });
    await logAccess(req, "qna_answer", id);
    res.status(201).json(out);
  }));

  r.put("/answers/:aid(\\d+)", ah(async (req, res) => {
    const aid = toInt(req.params.aid);
    const { content } = parse(answerSchema, req.body);
    const { rows } = await query("UPDATE qna_answers SET content = $2, updated_at = now() WHERE id = $1 RETURNING post_id", [aid, content]);
    if (!rows[0]) throw new HttpError(404, "답변을 찾을 수 없습니다.");
    await logAccess(req, "qna_answer_update", rows[0].post_id);
    res.json({ ok: true });
  }));

  if (!admin) return r;

  // ── 이하 관리자 전용 ──
  const restoreStatus = `CASE WHEN EXISTS (SELECT 1 FROM qna_answers a WHERE a.post_id = qna_posts.id) THEN 'answered' ELSE 'waiting' END`;
  const setStatus = (action, sql, from) => r.post(`/:id(\\d+)/${action}`, ah(async (req, res) => {
    const id = toInt(req.params.id);
    const { rowCount } = await query(`UPDATE qna_posts SET status = ${sql}, updated_at = now() WHERE id = $1${from ? ` AND status IN (${from})` : ""}`, [id]);
    if (!rowCount) throw new HttpError(404, "글을 찾을 수 없거나 이미 처리되었습니다.");
    await logAccess(req, `qna_${action}`, id);
    res.json({ ok: true });
  }));
  setStatus("approve", restoreStatus, "'review'");
  setStatus("hide", "'hidden'");
  setStatus("unhide", restoreStatus, "'hidden'");

  r.delete("/answers/:aid(\\d+)", ah(async (req, res) => {
    const aid = toInt(req.params.aid);
    const { rows } = await query("DELETE FROM qna_answers WHERE id = $1 RETURNING post_id", [aid]);
    if (!rows[0]) throw new HttpError(404, "답변을 찾을 수 없습니다.");
    await query(`UPDATE qna_posts SET status = 'waiting' WHERE id = $1 AND status = 'answered'
                   AND NOT EXISTS (SELECT 1 FROM qna_answers a WHERE a.post_id = $1)`, [rows[0].post_id]);
    await logAccess(req, "qna_answer_delete", rows[0].post_id);
    res.json({ ok: true });
  }));

  r.put("/:id(\\d+)/notice", ah(async (req, res) => {
    const id = toInt(req.params.id);
    const { isNotice } = parse(z.object({ isNotice: z.boolean() }), req.body);
    const { rowCount } = await query("UPDATE qna_posts SET is_notice = $2, updated_at = now() WHERE id = $1", [id, isNotice]);
    if (!rowCount) throw new HttpError(404, "글을 찾을 수 없습니다.");
    await logAccess(req, "qna_notice", id, isNotice ? "고정" : "고정 해제");
    res.json({ ok: true });
  }));

  // 공지글 작성 (관리자 이름 대신 '담아가넷'으로 표시, 비밀번호 없음)
  r.post("/notices", ah(async (req, res) => {
    const d = parse(noticeSchema, req.body);
    const name = (await getSetting("business")).name || "담아가넷";
    const { rows } = await query(
      `INSERT INTO qna_posts (author_name, title, content, is_secret, is_notice, status, author_id, ip)
       VALUES ($1,$2,$3,$4, TRUE, 'answered', $5, $6) RETURNING id`, [name, d.title, d.content, d.isSecret, req.user.id, normIp(req.ip)]);
    await logAccess(req, "qna_notice_create", rows[0].id);
    res.status(201).json({ id: rows[0].id });
  }));

  // 공지글 수정 (고객 글은 고칠 수 없음)
  r.put("/:id(\\d+)", ah(async (req, res) => {
    const id = toInt(req.params.id);
    const d = parse(noticeSchema, req.body);
    const { rowCount } = await query("UPDATE qna_posts SET title = $2, content = $3, is_secret = $4, updated_at = now() WHERE id = $1 AND author_id IS NOT NULL",
      [id, d.title, d.content, d.isSecret]);
    if (!rowCount) throw new HttpError(404, "관리자가 쓴 공지글만 수정할 수 있습니다.");
    await logAccess(req, "qna_notice_update", id);
    res.json({ ok: true });
  }));

  r.delete("/:id(\\d+)", ah(async (req, res) => {
    const id = toInt(req.params.id);
    const { rowCount } = await query("DELETE FROM qna_posts WHERE id = $1", [id]);
    if (!rowCount) throw new HttpError(404, "글을 찾을 수 없습니다.");
    await logAccess(req, "qna_delete", id);
    res.json({ ok: true });
  }));

  // [접수 DB로 등록] 이름·연락처·질문 제목 → leads (출처 qna). 같은 번호가 이미 있으면 DB 목록에 '중복' 표시
  r.post("/:id(\\d+)/lead", ah(async (req, res) => {
    const id = toInt(req.params.id);
    const statusId = await defaultStatusId();
    const out = await tx(async (c) => {
      const p = (await c.query("SELECT id, author_name, phone, title, consent_at, ip, lead_id FROM qna_posts WHERE id = $1 FOR UPDATE", [id])).rows[0];
      if (!p) throw new HttpError(404, "글을 찾을 수 없습니다.");
      if (!p.phone) throw new HttpError(400, "작성자가 연락처를 남기지 않은 글입니다.");
      if (p.lead_id) throw new HttpError(409, `이미 접수 DB에 등록된 글입니다. (접수번호 #${p.lead_id})`);
      const dup = (await c.query("SELECT count(*)::int AS n FROM leads WHERE phone = $1", [p.phone])).rows[0].n;
      const { rows } = await c.query(
        `INSERT INTO leads (name, phone, products, source, inquiry_type, message, status_id, consent_at, ip, created_by)
         VALUES ($1,$2,'{}','qna','qna',$3,$4,$5,$6,$7) RETURNING id`,
        [p.author_name.slice(0, 50), p.phone, `[질문/답변 #${p.id}] ${p.title}`, statusId, p.consent_at, p.ip, req.user.id]);
      await c.query("UPDATE qna_posts SET lead_id = $2 WHERE id = $1", [id, rows[0].id]);
      return { leadId: rows[0].id, duplicate: dup > 0 };
    });
    await logAccess(req, "qna_to_lead", id, { leadId: out.leadId });
    res.status(201).json(out);
  }));

  // ── 차단 IP ──
  r.get("/blocked", ah(async (req, res) => {
    const { rows } = await query("SELECT id, ip, reason, created_at FROM blocked_ips ORDER BY id DESC");
    res.json({ items: rows });
  }));
  const addBlock = async (req, ip, reason) => {
    await query("INSERT INTO blocked_ips (ip, reason) VALUES ($1, $2) ON CONFLICT (ip) DO UPDATE SET reason = EXCLUDED.reason", [ip, reason]);
    await logAccess(req, "qna_block_ip", null, { ip, reason });
  };
  r.post("/blocked", ah(async (req, res) => {
    const d = parse(ipSchema, req.body);
    await addBlock(req, d.ip, d.reason);
    res.status(201).json({ ok: true });
  }));
  r.post("/:id(\\d+)/block-ip", ah(async (req, res) => {
    const id = toInt(req.params.id);
    const p = (await query("SELECT ip, title FROM qna_posts WHERE id = $1", [id])).rows[0];
    if (!p?.ip) throw new HttpError(404, "작성 IP 가 없는 글입니다.");
    await addBlock(req, p.ip, `질문/답변 #${id} ${p.title}`.slice(0, 200));
    res.status(201).json({ ok: true, ip: p.ip });
  }));
  r.delete("/blocked/:bid(\\d+)", ah(async (req, res) => {
    const { rowCount } = await query("DELETE FROM blocked_ips WHERE id = $1", [toInt(req.params.bid)]);
    if (!rowCount) throw new HttpError(404, "차단 목록에 없습니다.");
    await logAccess(req, "qna_unblock_ip", req.params.bid);
    res.json({ ok: true });
  }));

  return r;
}
