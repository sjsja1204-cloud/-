// 간편 견적: 통신사 · 가입 서비스 · 속도 → 예상 월요금
// 클라이언트(client/src/lib/quote.js)와 같은 규칙. 저장할 때는 서버가 게시된 요금표로 다시 계산한다.
export const SPEED_ORDER = ["100M", "200M", "500M", "1G"];

/** 통신사에 실제 있는 속도 분류 (작은 순) */
export function speedsOf(carrier) {
  const set = new Set(carrier.priceTable.rows.map((r) => r.speed).filter(Boolean));
  return SPEED_ORDER.filter((s) => set.has(s));
}

const pos = (v) => Number.isFinite(v) && v > 0;

/** 휴대폰 결합 시 이 인터넷 상품(행)의 월 할인액. 결합 안 함·결합할인 꺼짐·할인액 없음이면 0 */
export function rowDiscount(carrier, row, mobile) {
  if (!mobile || carrier.bundle === false) return 0;
  return pos(row?.bundleDiscount) ? row.bundleDiscount : 0;
}

/**
 * 예상 월요금 { price, from, discount, discountUnknown } 또는 null ('상담 시 안내').
 * 인터넷 단독은 단독 요금, TV 포함은 해당 속도 TV 상품 중 가장 낮은 요금.
 * 휴대폰 결합(mobile)이면 행마다 결합 할인액을 뺀 뒤 가장 낮은 값.
 */
export function estimate(carrier, service, speed, mobile = false) {
  const rows = carrier.priceTable.rows.filter((r) => r.speed === speed);
  const cands = rows.flatMap((r) => {
    const vals = service === "internet" ? [r.internetOnly] : r.prices;
    const dc = rowDiscount(carrier, r, mobile);
    return vals.filter(pos).map((v) => ({ price: Math.max(0, v - dc), discount: dc }));
  });
  if (!cands.length) return null;
  const best = cands.reduce((a, b) => (b.price < a.price ? b : a));
  return {
    price: best.price,
    from: service !== "internet" || cands.length > 1,
    discount: best.discount,
    discountUnknown: !!mobile && carrier.bundle !== false && !best.discount,
  };
}

/**
 * 접수 창에서 고른 요금제의 월요금 { price, discount, discountUnknown } 또는 null ('상담 시 안내').
 * 인터넷만: 인터넷 단독 요금, TV 포함: 요금표 칸(행=인터넷, 열=TV). 휴대폰 결합이면 그 행의 결합 할인액을 뺀다.
 */
export function planQuote(carrier, service, internetPlan, tvPlan, mobile = false) {
  const row = carrier.priceTable.rows.find((r) => r.internet === internetPlan);
  if (!row) return null;
  let v;
  if (service === "internet") v = row.internetOnly;
  else {
    const j = carrier.priceTable.tvPlans.indexOf(tvPlan);
    v = j >= 0 ? row.prices[j] : null;
  }
  if (!pos(v)) return null;
  const dc = rowDiscount(carrier, row, mobile);
  return { price: Math.max(0, v - dc), discount: dc, discountUnknown: !!mobile && carrier.bundle !== false && !dc };
}

/** planQuote 의 금액만 (예전 호출부 호환) */
export function planPrice(carrier, service, internetPlan, tvPlan, mobile = false) {
  return planQuote(carrier, service, internetPlan, tvPlan, mobile)?.price ?? null;
}
