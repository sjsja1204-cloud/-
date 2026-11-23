// 버전 관리 콘텐츠 (요금표 plans, 메인 배너 hero, 혜택 문구 benefits)
// 흐름: 임시저장(draft) → 미리보기(관리자만 draft 조회) → 게시(published + content_versions 스냅샷)
import { z } from "zod";
import { query, tx } from "../db.js";
import { HttpError } from "./http.js";

export const VERSION_KEEP = 30;
export const ICONS = ["wifi", "tv", "phone", "link", "gift", "headset", "check", "star", "calc", "clipboard", "wrench", "shield", "bell", "chat", "question"];
export const THEMES = ["teal", "navy", "sand"];
// 예전 테마 이름(통신사 색과 겹치던 주황 등) → 새 이름
const LEGACY_THEME = { orange: "teal", mint: "sand" };
export const SPEEDS = ["100M", "200M", "500M", "1G"];
export const SERVICES = ["internet", "internet_tv", "internet_tv_usim"];

const str = (max) => z.string().max(max, `${max}자 이내로 입력하세요.`).default("");
const LINK_RE = /^(\/|#|https?:\/\/)/;
export const isLink = (v) => LINK_RE.test(v) && !/\s/.test(v);
const isImage = (v) => !v || /^(\/|https?:\/\/)\S+$/.test(v);

// ───────── 구조 스키마 (임시저장도 이 구조여야 함) ─────────
const box = z.object({
  title: str(200),
  items: z.array(z.tuple([str(100), str(100)])).max(50).optional(),
  bullets: z.array(str(300)).max(50).optional(),
  note: str(500).optional(),
});
const discountTable = z.object({
  title: str(200),
  desc: str(1000),
  columns: z.array(str(100)).max(12),
  rows: z.array(z.array(str(100)).max(12)).max(60),
  notes: z.array(str(500)).max(30).optional(),
  boxesTop: z.array(box).max(10).optional(),
  boxes: z.array(box).max(10).optional(),
});
const carrier = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,30}$/, "통신사 주소용 영문 id 가 올바르지 않습니다."),
  name: str(50),
  hidden: z.boolean().default(false),
  // 통신사 고유색은 쓰지 않음. 로고는 사용 권한이 있을 때만 (선택)
  logo: str(500).optional().default(""),
  tagline: str(200),
  formCarrier: str(50),
  priceTable: z.object({
    title: str(200),
    desc: str(1000),
    tvPlans: z.array(str(50)).max(10),
    rows: z.array(z.object({
      internet: str(50),
      speed: z.enum(SPEEDS).nullable().default(null), // 간편 견적용 속도 분류
      internetOnly: z.number().int().min(0).max(10_000_000).nullable().default(null), // 인터넷 단독 월요금 (비우면 '상담 시 안내')
      prices: z.array(z.number().int().min(0).max(10_000_000).nullable()).max(10),
    })).max(20),
    notes: z.array(str(500)).max(30).default([]),
  }),
  discountTables: z.array(discountTable).max(10).default([]),
});

export const contentSchemas = {
  plans: z.object({ carriers: z.array(carrier).max(20) }),
  hero: z.object({
    banners: z.array(z.object({
      kicker: str(50),
      title: str(200),
      desc: str(300),
      cta: z.object({ label: str(30), to: str(300) }),
      theme: z.preprocess((v) => LEGACY_THEME[v] ?? v, z.enum(THEMES).default("teal")),
      image: str(500).optional(),
    })).max(5),
  }),
  benefits: z.object({
    kicker: str(50),
    title: str(200),
    items: z.array(z.object({ icon: z.enum(ICONS), title: str(50), desc: str(200) })).max(4),
    promos: z.array(z.object({ tag: str(10), text: str(100) })).max(10),
  }),
  // 간편 견적 블록 (메인 화면 배너 바로 아래)
  quote: z.object({
    enabled: z.boolean().default(true),
    kicker: str(30),
    title: str(100),
    desc: str(300),
    liveBadge: str(20),
    services: z.object(Object.fromEntries(SERVICES.map((s) => [s, str(30)]))),
    usimNotice: str(300),
    speeds: z.object(Object.fromEntries(SPEEDS.map((s) => [s, z.object({ short: str(30), detail: str(200) })]))),
    mobileNo: str(20),
    mobileYes: str(20),
    mobileNote: str(200),
    resultNote: str(300),
    ctaLabel: str(30),
  }),
};
export const CONTENT_KEYS = Object.keys(contentSchemas);

// ───────── 게시 전 검사: 사람이 읽을 수 있는 위치 + 문제 ─────────
const blank = (v) => !String(v ?? "").trim();

export function publishIssues(key, d) {
  const out = [];
  const add = (where, msg) => out.push({ where, message: msg });
  if (key === "plans") {
    if (!d.carriers.some((c) => !c.hidden)) add("통신사", "공개된 통신사가 1곳 이상 있어야 합니다.");
    const ids = new Set();
    d.carriers.forEach((c, ci) => {
      const cn = c.name || `${ci + 1}번째 통신사`;
      if (blank(c.name)) add(cn, "통신사 이름이 비어 있습니다.");
      if (ids.has(c.id)) add(cn, "통신사 id 가 다른 통신사와 같습니다.");
      ids.add(c.id);
      if (!isImage(c.logo)) add(cn, "로고 이미지 주소가 올바르지 않습니다.");
      const pt = c.priceTable;
      if (blank(pt.title)) add(`${cn} › 요금표`, "요금표 제목이 비어 있습니다.");
      if (!pt.tvPlans.length) add(`${cn} › 요금표`, "TV 상품(열)이 1개 이상 있어야 합니다.");
      if (!pt.rows.length) add(`${cn} › 요금표`, "인터넷 상품(행)이 1개 이상 있어야 합니다.");
      pt.tvPlans.forEach((t, ti) => blank(t) && add(`${cn} › 요금표`, `${ti + 1}번째 TV 상품 이름이 비어 있습니다.`));
      pt.rows.forEach((r, ri) => {
        const rn = r.internet || `${ri + 1}번째 행`;
        if (blank(r.internet)) add(`${cn} › 요금표`, `${ri + 1}번째 인터넷 상품 이름이 비어 있습니다.`);
        pt.tvPlans.forEach((t, ti) => {
          const v = r.prices[ti];
          if (v == null || !Number.isFinite(v)) add(`${cn} › 요금표`, `'${rn}' × '${t || ti + 1 + "번째 열"}' 요금 칸이 비어 있습니다.`);
        });
      });
      c.discountTables.forEach((t, ti) => {
        const tn = `${cn} › 결합할인 '${t.title || ti + 1 + "번째 표"}'`;
        if (blank(t.title)) add(tn, "표 제목이 비어 있습니다.");
        if (t.rows.length && !t.columns.length) add(tn, "열 이름이 1개 이상 있어야 합니다.");
        t.columns.forEach((h, hi) => blank(h) && add(tn, `${hi + 1}번째 열 이름이 비어 있습니다.`));
        [...(t.boxesTop || []), ...(t.boxes || [])].forEach((b, bi) => {
          if (blank(b.title)) add(tn, `${bi + 1}번째 혜택 박스 제목이 비어 있습니다.`);
          (b.items || []).forEach((it, ii) => blank(it[0]) && add(tn, `'${b.title || "혜택 박스"}' ${ii + 1}번째 항목 이름이 비어 있습니다.`));
        });
      });
    });
  }
  if (key === "hero") {
    if (!d.banners.length) add("메인 배너", "배너가 1개 이상 있어야 합니다.");
    d.banners.forEach((b, i) => {
      const w = `메인 배너 ${i + 1}`;
      if (blank(b.title)) add(w, "큰 제목이 비어 있습니다.");
      if (blank(b.cta.label)) add(w, "버튼 문구가 비어 있습니다.");
      if (!isLink(b.cta.to)) add(w, "버튼 링크는 / 또는 # 또는 https:// 로 시작해야 합니다.");
      if (!isImage(b.image)) add(w, "배경 이미지 주소가 올바르지 않습니다.");
    });
  }
  if (key === "quote") {
    if (blank(d.title)) add("간편 견적", "제목이 비어 있습니다.");
    if (blank(d.ctaLabel)) add("간편 견적", "상담 신청 버튼 문구가 비어 있습니다.");
    SERVICES.forEach((s) => blank(d.services[s]) && add("간편 견적 › 가입 서비스", "서비스 이름이 비어 있습니다."));
    SPEEDS.forEach((s) => blank(d.speeds[s].short) && add(`간편 견적 › 속도 ${s}`, "짧은 설명이 비어 있습니다."));
    if (blank(d.mobileNo) || blank(d.mobileYes)) add("간편 견적 › 휴대폰 결합", "선택지 이름이 비어 있습니다.");
  }
  if (key === "benefits") {
    if (blank(d.title)) add("혜택 강조", "제목이 비어 있습니다.");
    if (d.items.length < 2) add("혜택 강조", "강조 문구는 2개 이상이어야 합니다.");
    d.items.forEach((it, i) => blank(it.title) && add(`혜택 강조 ${i + 1}`, "제목이 비어 있습니다."));
    d.promos.forEach((p, i) => blank(p.text) && add(`혜택 안내 문구 ${i + 1}`, "문구가 비어 있습니다."));
  }
  return out;
}

// ───────── 조회 (게시본은 메모리 캐시, 게시·되돌리기 시 무효화) ─────────
const cache = new Map();

export async function getPublished(key) {
  if (cache.has(key)) return cache.get(key);
  const { rows } = await query("SELECT published FROM site_content WHERE key = $1", [key]);
  if (!rows[0]) throw new HttpError(404, "콘텐츠가 없습니다.");
  cache.set(key, rows[0].published);
  return rows[0].published;
}

export async function getRow(key) {
  const { rows } = await query(
    `SELECT c.key, c.draft, c.published, c.updated_at, c.published_at, u.name AS updated_by_name,
            (c.draft <> c.published) AS has_unpublished
       FROM site_content c LEFT JOIN users u ON u.id = c.updated_by WHERE c.key = $1`,
    [key]
  );
  if (!rows[0]) throw new HttpError(404, "콘텐츠가 없습니다.");
  return rows[0];
}

export async function saveDraft(key, data, userId) {
  await query("UPDATE site_content SET draft = $2, updated_by = $3, updated_at = now() WHERE key = $1", [key, data, userId]);
}

/** draft(또는 지정 데이터)를 게시하고 스냅샷 저장, 오래된 버전 정리 */
export async function publish(key, data, userId, note = null) {
  const issues = publishIssues(key, data);
  if (issues.length) throw new HttpError(400, "고쳐야 할 항목이 있어 반영할 수 없습니다.", { issues });
  await tx(async (c) => {
    await c.query(
      `UPDATE site_content SET draft = $2, published = $2, updated_by = $3, updated_at = now(), published_at = now() WHERE key = $1`,
      [key, data, userId]
    );
    await c.query("INSERT INTO content_versions (content_key, data, published_by, note) VALUES ($1, $2, $3, $4)", [key, data, userId, note]);
    await c.query(
      `DELETE FROM content_versions WHERE content_key = $1 AND id NOT IN
         (SELECT id FROM content_versions WHERE content_key = $1 ORDER BY published_at DESC, id DESC LIMIT ${VERSION_KEEP})`,
      [key]
    );
  });
  cache.delete(key);
}
