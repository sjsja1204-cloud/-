// 고객 폼 / 직원 접수 공통 선택지 (서버 lib/constants.js 와 동일하게 유지)
export const PRODUCTS = ["휴대폰", "인터넷", "인터넷+TV", "결합상품"];
export const CARRIERS = ["KT", "LG U+", "SK", "KT스카이라이프", "상관없음"];
export const CALL_TIMES = ["언제든 가능", "오전 (9~12시)", "오후 (12~18시)", "저녁 (18시 이후)"];
export const SOURCE_LABEL = { web: "홈페이지", staff: "직원접수", upload: "엑셀업로드" };

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
