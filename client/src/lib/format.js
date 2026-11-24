// 관심 상품·희망 통신사 선택지는 관리자 > 사이트 설정에서 관리 (useSiteData().formOptions)
export const formatWon = (n) => (typeof n === "number" ? n.toLocaleString("ko-KR") + "원" : "-");
export const CALL_TIMES = ["언제든 가능", "오전 (9~12시)", "오후 (12~18시)", "저녁 (18시 이후)"];
export const SOURCE_LABEL = { web: "홈페이지", staff: "직원접수", upload: "엑셀업로드", qna: "질문/답변" };
// 홈페이지 접수 유형 (값은 고정, 고객 화면 버튼 문구는 관리자에서 변경). qna = 질문/답변에서 [접수 DB로 등록]
export const INQUIRY_LABEL = { form: "상담 폼", subsidy: "지원금 안내", consult: "맞춤 상담", recommend: "상품 찾기", quote: "간편 견적", qna: "질문/답변" };
export const inquiryLabel = (l) => (l.source === "web" ? INQUIRY_LABEL[l.inquiry_type] || "상담 폼" : "");
/** 견적 조건 한 줄: "SK · 인터넷+TV · 500M · 휴대폰 결합" */
export const quoteSummary = (l) =>
  l.quote_carrier
    ? [l.quote_carrier, l.quote_service, l.quote_internet_plan || l.quote_speed, l.quote_tv_plan, l.quote_mobile_bundle ? "휴대폰 결합" : null]
        .filter(Boolean).join(" · ")
    : "";

/** 입력 중 자동 하이픈: 01012345678 → 010-1234-5678 */
export function hyphenPhone(v) {
  const d = String(v || "").replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}
export const isValidMobile = (v) => /^01[016789]\d{7,8}$/.test(String(v || "").replace(/\D/g, ""));

const KST = { timeZone: "Asia/Seoul" };
export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString("ko-KR", { ...KST, month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }) : "-";
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("ko-KR", { ...KST, month: "2-digit", day: "2-digit" }) : "-");
/** 한국시간 기준 YYYY-MM-DD */
export const kstDateStr = (d = new Date()) => new Date(d).toLocaleDateString("sv-SE", KST);
