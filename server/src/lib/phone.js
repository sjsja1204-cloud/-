/** 숫자만 남김 */
export const digitsOnly = (v) => String(v ?? "").replace(/\D/g, "");

/** 휴대폰 번호(01X + 7~8자리)인지 */
export const isValidMobile = (digits) => /^01[016789]\d{7,8}$/.test(digits);

/** 01012345678 → 010-1234-5678 */
export function formatPhone(digits) {
  const d = digitsOnly(digits);
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return d;
}

/** 01012345678 → 010-****-5678 (직원 화면용, 서버에서 마스킹) */
export function maskPhone(digits) {
  const d = digitsOnly(digits);
  if (d.length < 8) return "****";
  return `${d.slice(0, 3)}-****-${d.slice(-4)}`;
}

/**
 * 엑셀 셀 값에서 휴대폰 번호 정규화.
 * 엑셀이 숫자로 저장하면 앞자리 0 이 빠지므로(1012345678) 보정한다.
 */
export function normalizeExcelPhone(raw) {
  let d = digitsOnly(raw);
  if (/^1[016789]\d{7,8}$/.test(d)) d = "0" + d;
  return d;
}
