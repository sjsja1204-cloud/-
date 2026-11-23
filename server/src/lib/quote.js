// 간편 견적: 통신사 · 가입 서비스 · 속도 → 예상 월요금
// 클라이언트(client/src/lib/quote.js)와 같은 규칙. 저장할 때는 서버가 게시된 요금표로 다시 계산한다.
export const SPEED_ORDER = ["100M", "200M", "500M", "1G"];

/** 통신사에 실제 있는 속도 분류 (작은 순) */
export function speedsOf(carrier) {
  const set = new Set(carrier.priceTable.rows.map((r) => r.speed).filter(Boolean));
  return SPEED_ORDER.filter((s) => set.has(s));
}

/**
 * 예상 월요금. 인터넷 단독은 단독 요금, TV 포함은 해당 속도 TV 상품 중 가장 낮은 요금.
 * 데이터가 없으면 null ('상담 시 안내')
 */
export function estimate(carrier, service, speed) {
  const rows = carrier.priceTable.rows.filter((r) => r.speed === speed);
  const vals = service === "internet" ? rows.map((r) => r.internetOnly) : rows.flatMap((r) => r.prices);
  const nums = vals.filter((v) => Number.isFinite(v) && v > 0);
  if (!nums.length) return null;
  return { price: Math.min(...nums), from: service !== "internet" || nums.length > 1 };
}
