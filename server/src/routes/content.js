// 고객용(비로그인) 콘텐츠 API: 게시판 글, 실시간 접수 현황
import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";
import { ah, parse, HttpError, toInt } from "../lib/http.js";

const router = Router();
const BOARDS = ["notice", "event", "review", "faq"];
const PUBLIC_FIELDS = `id, board, title, image_url, link_url, is_pinned, starts_on, ends_on,
  review_name, review_rating, review_tag, view_count, created_at`;

const listSchema = z.object({
  board: z.enum(BOARDS),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  withContent: z.enum(["0", "1"]).optional(),
});

router.get(
  "/posts",
  ah(async (req, res) => {
    const f = parse(listSchema, req.query);
    // FAQ·후기는 목록에서 본문을 바로 보여줘야 하므로 content 포함
    const withContent = f.withContent === "1" || f.board === "faq" || f.board === "review";
    const order = f.board === "faq" ? "sort_order ASC, id ASC" : "is_pinned DESC, created_at DESC, id DESC";
    const [list, count] = await Promise.all([
      query(
        `SELECT ${PUBLIC_FIELDS}${withContent ? ", content" : ""} FROM posts
          WHERE board = $1 AND is_published ORDER BY ${order}
          LIMIT ${f.pageSize} OFFSET ${(f.page - 1) * f.pageSize}`,
        [f.board]
      ),
      query("SELECT count(*)::int AS n FROM posts WHERE board = $1 AND is_published", [f.board]),
    ]);
    res.set("Cache-Control", "public, max-age=30");
    res.json({ items: list.rows, total: count.rows[0].n, page: f.page, pageSize: f.pageSize });
  })
);

router.get(
  "/posts/:id",
  ah(async (req, res) => {
    const id = toInt(req.params.id);
    if (!id) throw new HttpError(400, "잘못된 요청입니다.");
    const { rows } = await query(
      `UPDATE posts SET view_count = view_count + 1 WHERE id = $1 AND is_published
       RETURNING ${PUBLIC_FIELDS}, content`,
      [id]
    );
    if (!rows[0]) throw new HttpError(404, "게시글을 찾을 수 없습니다.");
    res.json({ post: rows[0] });
  })
);

// ───────── 실시간 접수 현황 (롤링 배너) ─────────
// 실제 접수 DB 만 사용. 이름은 첫 글자만 남기고 가리며 연락처·메모 등은 절대 내보내지 않는다.
// 접수가 적으면 클라이언트가 혜택 안내 문구로 대체한다 (가짜 접수를 만들지 않음).
const maskName = (n) => {
  const s = String(n || "").trim();
  if (!s) return "고객";
  return s[0] + "*".repeat(Math.max(1, Math.min(s.length - 1, 3)));
};
let tickerCache = { at: 0, data: null };

router.get(
  "/ticker",
  ah(async (req, res) => {
    if (!tickerCache.data || Date.now() - tickerCache.at > 30_000) {
      const { rows } = await query(
        `SELECT l.name, l.products, l.carrier, s.name AS status, l.created_at
           FROM leads l JOIN lead_statuses s ON s.id = l.status_id
          WHERE l.created_at >= now() - interval '30 days' AND l.source = 'web' AND l.consent_at IS NOT NULL
          ORDER BY l.created_at DESC LIMIT 15`
      );
      tickerCache = {
        at: Date.now(),
        data: rows.map((r) => ({
          name: maskName(r.name),
          product: (r.products || [])[0] || "상담",
          carrier: r.carrier && r.carrier !== "상관없음" ? r.carrier : null,
          status: r.status,
          createdAt: r.created_at,
        })),
      };
    }
    res.set("Cache-Control", "public, max-age=30");
    res.json({ items: tickerCache.data });
  })
);

export default router;
