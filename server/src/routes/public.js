// 고객용(비로그인) API: 상담 접수
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { query } from "../db.js";
import { ah, parse } from "../lib/http.js";
import { leadBaseSchema, defaultStatusId } from "../lib/leadQueries.js";
import { assertFormOptions, getSetting } from "../lib/settings.js";
import { getPublished, SPEEDS, SERVICES } from "../lib/content.js";
import { estimate, speedsOf, planPrice } from "../lib/quote.js";
import { INQUIRY_TYPES } from "../lib/constants.js";
import { HttpError } from "../lib/http.js";
import { notifyNewLead } from "../lib/telegram.js";

const router = Router();

// 같은 IP 1분 3회 제한
// TODO(확인필요): 메모리 저장소라 서버 재시작 시 초기화되고, 인스턴스가 여러 개면 인스턴스별로 계산됨 (Render 단일 인스턴스 기준)
const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 3,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "잠시 후 다시 시도해 주세요. (1분에 3회까지 접수 가능)" },
});

const optStr = (max) => z.string().trim().max(max).optional().nullable().transform((v) => v || null);

const submitSchema = leadBaseSchema.extend({
  // 상담 폼(form) 외 유형은 이름·연락처만 받으므로 상품·통신사는 선택
  products: z.array(z.string().trim().max(30)).max(20).default([]).transform((a) => [...new Set(a)]),
  carrier: z.string().trim().max(30).optional().default(""),
  inquiryType: z.enum(INQUIRY_TYPES).default("form"),
  // 접수 창 1단계 상품 선택 (통신사·가입 서비스만 필수). carrier 'unknown' = 잘 모르겠어요(추천받기)
  quote: z.object({
    carrier: z.string().max(30),
    service: z.enum(SERVICES),
    speed: z.enum(SPEEDS).optional().nullable(),          // 간편 견적에서 고른 속도
    internetPlan: z.string().max(100).optional().nullable(), // 요금표 행 이름 (null = 추천받기)
    tvPlan: z.string().max(100).optional().nullable(),       // 요금표 열 이름 (null = 추천받기)
    mobileBundle: z.boolean().optional().nullable(),
  }).optional().nullable(),
  consent: z.literal(true, { errorMap: () => ({ message: "개인정보 수집·이용에 동의해 주세요." }) }),
  website: z.string().optional(), // honeypot (사람에게는 보이지 않는 필드)
  utmSource: optStr(200),
  utmMedium: optStr(200),
  utmCampaign: optStr(200),
  referrer: optStr(1000),
}).superRefine((d, ctx) => {
  if (d.inquiryType === "form") {
    if (!d.products.length) ctx.addIssue({ code: "custom", path: ["products"], message: "관심 상품을 1개 이상 선택하세요." });
    if (!d.carrier) ctx.addIssue({ code: "custom", path: ["carrier"], message: "희망 통신사를 선택하세요." });
  }
  if (d.inquiryType !== "form" && !d.quote) ctx.addIssue({ code: "custom", path: ["quote"], message: "통신사와 가입 서비스를 선택해 주세요." });
  if (d.inquiryType === "form" && d.quote) ctx.addIssue({ code: "custom", path: ["quote"], message: "잘못된 요청입니다." });
});

export const UNKNOWN_CARRIER = "unknown";
export const UNKNOWN_LABEL = "잘 모르겠어요(추천받기)";
const bad = (m) => { throw new HttpError(400, m); };

/** 상품 선택 → 저장용 글자값 + 예상 월요금 (게시된 요금표로 서버가 다시 계산) */
async function resolveQuote(q) {
  const [plans, qc, opt] = await Promise.all([getPublished("plans"), getPublished("quote"), getSetting("form_options")]);
  const serviceLabel = qc.services?.[q.service] || q.service;
  if (q.carrier === UNKNOWN_CARRIER) {
    if (q.speed || q.internetPlan || q.tvPlan) bad("요금제는 통신사를 고른 뒤에 선택할 수 있습니다.");
    return { quote_carrier: UNKNOWN_LABEL, quote_service: serviceLabel, quote_speed: null, quote_internet_plan: null, quote_tv_plan: null,
      quote_mobile_bundle: q.mobileBundle ?? null, quote_estimated_price: null, formCarrier: "" };
  }
  const c = plans.carriers.find((x) => x.id === q.carrier && !x.hidden);
  if (!c) bad("선택한 통신사를 찾을 수 없습니다. 새로고침 후 다시 선택해 주세요.");
  const bundle = c.bundle !== false;
  if (!bundle && q.service === "internet_tv_usim") bad("이 통신사는 인터넷+TV+유심 가입을 받지 않습니다.");
  if (!bundle && q.mobileBundle) bad("이 통신사는 휴대폰 결합을 받지 않습니다.");
  if (q.speed && !speedsOf(c).includes(q.speed)) bad("선택한 속도를 다시 확인해 주세요.");
  const row = q.internetPlan ? c.priceTable.rows.find((r) => r.internet === q.internetPlan) : null;
  if (q.internetPlan && !row) bad("선택한 인터넷 요금제를 찾을 수 없습니다. 새로고침 후 다시 선택해 주세요.");
  if (row && q.speed && row.speed !== q.speed) bad("선택한 속도와 인터넷 요금제가 맞지 않습니다.");
  const withTv = q.service !== "internet";
  if (q.tvPlan && (!withTv || !c.priceTable.tvPlans.includes(q.tvPlan))) bad("선택한 TV 요금제를 다시 확인해 주세요.");
  // 요금: 요금제를 골랐으면 그 칸, 속도만 골랐으면(간편 견적) 그 속도의 최저 요금. 휴대폰 결합이면 결합 할인액을 뺀 금액
  const mobile = bundle && q.mobileBundle === true;
  let price = null;
  if (row && (!withTv || q.tvPlan)) price = planPrice(c, q.service, row.internet, q.tvPlan, mobile);
  else if (q.speed) price = estimate(c, q.service, q.speed, mobile)?.price ?? null;
  return {
    quote_carrier: c.name,
    quote_service: serviceLabel,
    quote_speed: q.speed || row?.speed || null,
    quote_internet_plan: row?.internet ?? null,
    quote_tv_plan: withTv ? q.tvPlan ?? null : null,
    quote_mobile_bundle: bundle ? q.mobileBundle ?? null : null,
    quote_estimated_price: price,
    formCarrier: opt.carriers.includes(c.formCarrier) ? c.formCarrier : "",
  };
}

router.post(
  "/leads",
  submitLimiter,
  ah(async (req, res) => {
    // honeypot 이 채워져 있으면 봇으로 보고 저장하지 않되, 봇이 눈치채지 못하게 성공 응답
    if (typeof req.body?.website === "string" && req.body.website.trim() !== "") {
      console.warn("[honeypot] 차단", req.ip);
      return res.status(201).json({ ok: true });
    }
    const d = parse(submitSchema, req.body);
    await assertFormOptions(d);
    const q = d.quote ? await resolveQuote(d.quote) : null;
    const carrier = d.carrier || q?.formCarrier || null;
    const statusId = await defaultStatusId();
    const { rows } = await query(
      `INSERT INTO leads (name, phone, products, carrier, call_time, message, source,
                          utm_source, utm_medium, utm_campaign, referrer, status_id, consent_at, ip,
                          inquiry_type, quote_carrier, quote_service, quote_speed, quote_mobile_bundle, quote_estimated_price,
                          quote_internet_plan, quote_tv_plan)
       VALUES ($1,$2,$3,$4,$5,$6,'web',$7,$8,$9,$10,$11, now(), $12, $13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING id, name, phone, products, carrier, call_time, utm_source, utm_medium, utm_campaign,
                 inquiry_type, quote_carrier, quote_service, quote_speed, quote_mobile_bundle, quote_estimated_price,
                 quote_internet_plan, quote_tv_plan`,
      [d.name, d.phone, d.products, carrier, d.callTime || null, d.message || null,
       d.utmSource, d.utmMedium, d.utmCampaign, d.referrer, statusId, req.ip,
       d.inquiryType, q?.quote_carrier ?? null, q?.quote_service ?? null, q?.quote_speed ?? null,
       q?.quote_mobile_bundle ?? null, q?.quote_estimated_price ?? null,
       q?.quote_internet_plan ?? null, q?.quote_tv_plan ?? null]
    );
    notifyNewLead(rows[0]); // 응답을 기다리게 하지 않음
    res.status(201).json({ ok: true });
  })
);

export default router;
