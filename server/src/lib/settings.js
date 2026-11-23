// 사이트 설정 (사업자 정보, 접수 폼 선택지, 텔레그램 Chat ID) — 저장 즉시 반영
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
  }),
  form_options: z.object({ products: optList, carriers: optList }),
  telegram: z.object({
    chatId: z.string().trim().max(50).refine((v) => !v || /^-?\d+$|^@[\w]+$/.test(v), "Chat ID 는 숫자(그룹은 -로 시작)입니다.").default(""),
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
  if (!opt.carriers.includes(carrier)) throw new HttpError(400, "희망 통신사를 다시 선택해 주세요.");
}
