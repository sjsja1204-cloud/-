// 고객 화면용 공개 API: 요금표, 메인 문구, 팝업, 공개 설정
// 응답은 서버 메모리에 캐시하고(게시 시 무효화), 브라우저는 ETag 로 매번 확인 → 게시 즉시 반영
import { Router } from "express";
import { query } from "../db.js";
import { ah } from "../lib/http.js";
import { getPublished } from "../lib/content.js";
import { getSetting } from "../lib/settings.js";

const router = Router();
const noCache = (res) => res.set("Cache-Control", "no-cache");

router.get("/plans", ah(async (req, res) => {
  const plans = await getPublished("plans");
  noCache(res);
  res.json({ carriers: plans.carriers.filter((c) => !c.hidden) });
}));

router.get("/site", ah(async (req, res) => {
  const [hero, benefits, quote, menu] = await Promise.all(["hero", "benefits", "quote", "menu"].map((k) => getPublished(k)));
  noCache(res);
  res.json({ hero, benefits, quote, menu });
}));

router.get("/popups", ah(async (req, res) => {
  const { rows } = await query(
    `SELECT id, image_url, alt, link, title, body, button_text, updated_at
       FROM popups
      WHERE is_active
        AND (start_at IS NULL OR start_at <= (now() AT TIME ZONE 'Asia/Seoul')::date)
        AND (end_at   IS NULL OR end_at   >= (now() AT TIME ZONE 'Asia/Seoul')::date)
      ORDER BY sort_order, id`
  );
  noCache(res);
  res.json({ items: rows });
}));

router.get("/settings/public", ah(async (req, res) => {
  const [business, formOptions, brand, consult] = await Promise.all(
    ["business", "form_options", "brand", "consult"].map((k) => getSetting(k))
  );
  noCache(res);
  res.json({ business, formOptions, brand, consult });
}));

export default router;
