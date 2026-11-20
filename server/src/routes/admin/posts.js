// 관리자: 게시판 관리 (공지사항 / 이벤트 / 상담후기 / FAQ)
import { Router } from "express";
import { z } from "zod";
import { query } from "../../db.js";
import { ah, parse, HttpError, toInt } from "../../lib/http.js";
import { logAccess } from "../../lib/accessLog.js";

const router = Router();
const BOARDS = ["notice", "event", "review", "faq"];

router.get(
  "/",
  ah(async (req, res) => {
    const { board } = parse(z.object({ board: z.enum(BOARDS, { errorMap: () => ({ message: "게시판을 선택하세요." }) }) }), req.query);
    const order = board === "faq" ? "sort_order ASC, id ASC" : "is_pinned DESC, created_at DESC, id DESC";
    const { rows } = await query(
      `SELECT p.*, u.name AS author_name FROM posts p LEFT JOIN users u ON u.id = p.author_id
        WHERE board = $1 ORDER BY ${order} LIMIT 500`,
      [board]
    );
    res.json({ items: rows });
  })
);

const url = z.string().trim().max(1000)
  .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//.test(v) || v.startsWith("#"), "링크는 / 또는 http(s):// 로 시작해야 합니다.")
  .optional().nullable().transform((v) => v || null);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal("").transform(() => null));

const postSchema = z.object({
  board: z.enum(BOARDS),
  title: z.string().trim().min(1, "제목을 입력하세요.").max(200),
  content: z.string().max(20000).default(""),
  imageUrl: url,
  linkUrl: url,
  isPinned: z.boolean().default(false),
  isPublished: z.boolean().default(true),
  startsOn: date,
  endsOn: date,
  reviewName: z.string().trim().max(20).optional().nullable().transform((v) => v || null),
  reviewRating: z.number().int().min(1).max(5).optional().nullable(),
  reviewTag: z.string().trim().max(50).optional().nullable().transform((v) => v || null),
  sortOrder: z.number().int().min(-10000).max(10000).default(0),
});

const cols = (d) => [d.board, d.title, d.content, d.imageUrl, d.linkUrl, d.isPinned, d.isPublished,
  d.startsOn ?? null, d.endsOn ?? null, d.reviewName, d.reviewRating ?? null, d.reviewTag, d.sortOrder];

router.post(
  "/",
  ah(async (req, res) => {
    const d = parse(postSchema, req.body);
    const { rows } = await query(
      `INSERT INTO posts (board, title, content, image_url, link_url, is_pinned, is_published, starts_on, ends_on,
                          review_name, review_rating, review_tag, sort_order, author_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [...cols(d), req.user.id]
    );
    await logAccess(req, "post_create", rows[0].id, { board: d.board });
    res.status(201).json({ post: rows[0] });
  })
);

router.put(
  "/:id",
  ah(async (req, res) => {
    const id = toInt(req.params.id);
    const d = parse(postSchema, req.body);
    const { rows } = await query(
      `UPDATE posts SET board=$1, title=$2, content=$3, image_url=$4, link_url=$5, is_pinned=$6, is_published=$7,
              starts_on=$8, ends_on=$9, review_name=$10, review_rating=$11, review_tag=$12, sort_order=$13, updated_at=now()
        WHERE id = $14 RETURNING *`,
      [...cols(d), id]
    );
    if (!rows[0]) throw new HttpError(404, "게시글을 찾을 수 없습니다.");
    await logAccess(req, "post_update", id);
    res.json({ post: rows[0] });
  })
);

router.delete(
  "/:id",
  ah(async (req, res) => {
    const id = toInt(req.params.id);
    const { rowCount } = await query("DELETE FROM posts WHERE id = $1", [id]);
    if (!rowCount) throw new HttpError(404, "게시글을 찾을 수 없습니다.");
    await logAccess(req, "post_delete", id);
    res.json({ ok: true });
  })
);

export default router;
