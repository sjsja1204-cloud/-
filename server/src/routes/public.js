// 고객용(비로그인) API: 상담 접수
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { query } from "../db.js";
import { ah, parse } from "../lib/http.js";
import { leadBaseSchema, defaultStatusId } from "../lib/leadQueries.js";
import { assertFormOptions } from "../lib/settings.js";
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
  consent: z.literal(true, { errorMap: () => ({ message: "개인정보 수집·이용에 동의해 주세요." }) }),
  website: z.string().optional(), // honeypot (사람에게는 보이지 않는 필드)
  utmSource: optStr(200),
  utmMedium: optStr(200),
  utmCampaign: optStr(200),
  referrer: optStr(1000),
});

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
    const statusId = await defaultStatusId();
    const { rows } = await query(
      `INSERT INTO leads (name, phone, products, carrier, call_time, message, source,
                          utm_source, utm_medium, utm_campaign, referrer, status_id, consent_at, ip)
       VALUES ($1,$2,$3,$4,$5,$6,'web',$7,$8,$9,$10,$11, now(), $12)
       RETURNING id, name, phone, products, carrier, call_time, utm_source, utm_medium, utm_campaign`,
      [d.name, d.phone, d.products, d.carrier, d.callTime || null, d.message || null,
       d.utmSource, d.utmMedium, d.utmCampaign, d.referrer, statusId, req.ip]
    );
    notifyNewLead(rows[0]); // 응답을 기다리게 하지 않음
    res.status(201).json({ ok: true });
  })
);

export default router;
