import { config } from "../config.js";
import { maskPhone } from "./phone.js";
import { getSetting } from "./settings.js";
import { INQUIRY_LABELS, quoteSummary } from "./constants.js";

const escapeHtml = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

/**
 * 신규 접수 텔레그램 알림. 응답을 막지 않도록 호출부에서 await 하지 않는다.
 * TODO(확인필요): 개인정보 노출 최소화를 위해 연락처는 마스킹해서 보낸다. 원본이 필요하면 관리자 페이지에서 확인.
 */
export async function notifyNewLead(lead) {
  const lines = [
    "📥 <b>[담아가넷] 신규 상담 접수</b>",
    `접수 유형: ${escapeHtml(INQUIRY_LABELS[lead.inquiry_type] || "상담 폼")}`,
    `이름: ${escapeHtml(lead.name)}`,
    `연락처: ${maskPhone(lead.phone)}`,
    lead.products?.length ? `관심상품: ${escapeHtml(lead.products.join(", "))}` : null,
    lead.carrier ? `희망통신사: ${escapeHtml(lead.carrier)}` : null,
    lead.quote_carrier ? `견적 조건: ${escapeHtml(quoteSummary(lead))}` : null,
    lead.quote_carrier ? `예상 월요금: ${lead.quote_estimated_price ? lead.quote_estimated_price.toLocaleString("ko-KR") + "원" : "상담 시 안내"}` : null,
    lead.call_time ? `통화가능: ${escapeHtml(lead.call_time)}` : null,
    `유입: ${escapeHtml([lead.utm_source, lead.utm_medium, lead.utm_campaign].filter(Boolean).join(" / ") || "직접")}`,
    `접수번호: #${lead.id}`,
  ].filter(Boolean);
  return send(lines.join("\n"));
}

/** 질문/답변 새 글 알림 (연락처·본문은 보내지 않음) */
export async function notifyNewQna(post) {
  const lines = [
    "❓ <b>[담아가넷] 질문/답변 새 글</b>",
    `제목: ${escapeHtml(post.title)}`,
    `비밀글: ${post.is_secret ? "예" : "아니오"}${post.phone ? " · 연락처 남김" : ""}`,
    post.status === "review" ? "⚠ 링크가 있어 <b>검토중</b> (승인 전 비공개)" : null,
    `답변하기: ${escapeHtml(`${config.siteUrl}/admin/qna?id=${post.id}`)}`,
  ].filter(Boolean);
  return send(lines.join("\n"));
}

async function send(text) {
  // Chat ID: 관리자 > 사이트 설정 값 우선, 비어 있으면 .env 값
  const chatId = (await getSetting("telegram").catch(() => ({}))).chatId || config.telegram.chatId;
  if (!config.telegram.token || !chatId) {
    console.log("[telegram] 토큰 미설정 — 알림 생략\n" + text);
    return { skipped: true };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${config.telegram.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error("[telegram] 전송 실패", res.status, await res.text());
    return { ok: res.ok };
  } catch (e) {
    console.error("[telegram] 전송 오류", e.message);
    return { ok: false };
  }
}
