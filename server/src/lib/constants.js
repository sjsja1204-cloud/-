// 접수 출처 (관심 상품·통신사 선택지는 관리자 > 사이트 설정에서 관리 — lib/settings.js)
export const SOURCES = ["web", "staff", "upload", "qna"];

// 접수 유형 (홈페이지 접수 경로). 화면 이름은 관리자에서 바꿔도 값은 고정
export const INQUIRY_TYPES = ["form", "subsidy", "consult", "recommend", "quote"];
// 관리자 필터용: 질문/답변에서 [접수 DB로 등록]한 건 (고객 접수 폼에서는 받지 않음)
export const LEAD_INQUIRY_TYPES = [...INQUIRY_TYPES, "qna"];
export const INQUIRY_LABELS = { form: "상담 폼", subsidy: "지원금 안내", consult: "맞춤 상담", recommend: "상품 찾기", quote: "간편 견적", qna: "질문/답변" };

/** 견적 조건 한 줄: "SK · 인터넷+TV · 500M · 휴대폰 결합" */
export function quoteSummary(l) {
  if (!l.quote_carrier) return "";
  return [l.quote_carrier, l.quote_service, l.quote_internet_plan || l.quote_speed, l.quote_tv_plan,
    l.quote_mobile_bundle ? "휴대폰 결합" : null].filter(Boolean).join(" · ");
}
