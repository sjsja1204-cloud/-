// 사이트 설정 (사업자 정보, 접수 폼 선택지, 텔레그램 Chat ID, 브랜드 색, 빠른 상담 메뉴) — 저장 즉시 반영
import { z } from "zod";
import { query } from "../db.js";
import { HttpError } from "./http.js";
import { settings as defaults } from "../../seed/defaults.js";

const text = (max) => z.string().trim().max(max, `${max}자 이내로 입력하세요.`).default("");
const optList = z
  .array(z.string().trim().min(1, "빈 항목이 있습니다.").max(30, "항목은 30자 이내로 입력하세요."))
  .min(1, "항목을 1개 이상 남겨 두세요.")
  .max(20)
  .refine((a) => new Set(a).size === a.length, "같은 이름의 항목이 있습니다.");

export const settingSchemas = {
  business: z.object({
    name: z.string().trim().min(1, "상호를 입력하세요.").max(50),
    ceo: text(30),
    email: z.string().trim().max(100).refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "이메일 형식이 올바르지 않습니다.").default(""),
    address: text(200),
    bizNumber: text(30),
    ecommerceNumber: text(50),
    phone: z.string().trim().max(20).refine((v) => !v || /^[\d-]{7,20}$/.test(v), "대표번호는 숫자와 - 만 입력하세요.").default(""),
    privacyOfficerName: text(30),
    privacyOfficerEmail: z.string().trim().max(100).refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "보호책임자 이메일 형식이 올바르지 않습니다.").default(""),
    hours: text(100),
    kakaoUrl: z.string().trim().max(300).refine((v) => !v || /^https:\/\/\S+$/.test(v), "카카오톡 채널 주소는 https:// 로 시작해야 합니다.").default(""),
    // '실시간 상담중' 표시용 (한국시간). 비우면 표시 안 함
    openTime: z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, "시간은 09:00 형식으로 입력하세요.").default(""),
    closeTime: z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, "시간은 18:00 형식으로 입력하세요.").default(""),
    openDays: z.array(z.number().int().min(0).max(6)).max(7).default([1, 2, 3, 4, 5]),
  }),
  form_options: z.object({ products: optList, carriers: optList }),
  brand: z.object({
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "색상 값이 올바르지 않습니다.").default("#0E8F7E"),
  }),
  consult: z.object({
    menu: z.array(z.object({
      type: z.enum(["subsidy", "consult", "recommend", "call"]),
      label: z.string().trim().min(1, "버튼 문구를 입력하세요.").max(20, "버튼 문구는 20자 이내로 입력하세요."),
      enabled: z.boolean(),
    })).min(1).max(4).refine((a) => new Set(a.map((m) => m.type)).size === a.length, "같은 버튼이 두 번 있습니다."),
    modals: z.object(Object.fromEntries(["subsidy", "consult", "recommend", "quote"].map((k) => [k, z.object({
      title: z.string().trim().min(1, "창 제목을 입력하세요.").max(60),
      desc: text(200),
      submitLabel: text(20), // 비우면 공통 신청 버튼 문구
    })]))),
    submitLabel: z.string().trim().min(1, "신청 버튼 문구를 입력하세요.").max(20),
    doneTitle: z.string().trim().min(1, "완료 제목을 입력하세요.").max(40),
    doneDesc: text(120),
  }),
  telegram: z.object({
    chatId: z.string().trim().max(50).refine((v) => !v || /^-?\d+$|^@[\w]+$/.test(v), "Chat ID 는 숫자(그룹은 -로 시작)입니다.").default(""),
  }),
  // 질문/답변 게시판: 금지어(포함되면 등록 차단) · 직원 답변 권한
  qna: z.object({
    bannedWords: z.array(z.string().trim().min(1, "빈 금지어가 있습니다.").max(50, "금지어는 50자 이내로 입력하세요.")).max(500, "금지어는 500개까지 등록할 수 있습니다.")
      .default([]).transform((a) => [...new Set(a)]),
    staffAnswer: z.boolean().default(false),
  }),
};
export const SETTING_KEYS = Object.keys(settingSchemas);

const cache = new Map();

export async function getSetting(key) {
  if (cache.has(key)) return cache.get(key);
  const { rows } = await query("SELECT value FROM site_settings WHERE key = $1", [key]);
  // 빠진 필드는 시드 기본값으로 채움 (필드가 추가돼도 깨지지 않게)
  const value = { ...(defaults[key] || {}), ...(rows[0]?.value || {}) };
  cache.set(key, value);
  return value;
}

export async function saveSetting(key, value, userId) {
  await query(
    `INSERT INTO site_settings (key, value, updated_by, updated_at) VALUES ($1, $2, $3, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [key, value, userId]
  );
  cache.delete(key);
}

/** 고객 폼·직원 접수 값이 현재 선택지 안에 있는지 확인 */
export async function assertFormOptions({ products, carrier }) {
  const opt = await getSetting("form_options");
  const bad = products.find((p) => !opt.products.includes(p));
  if (bad) throw new HttpError(400, `관심 상품 '${bad}' 은(는) 선택할 수 없습니다. 새로고침 후 다시 시도해 주세요.`);
  if (carrier && !opt.carriers.includes(carrier)) throw new HttpError(400, "희망 통신사를 다시 선택해 주세요.");
}
