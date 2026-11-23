// 간편 견적 계산 — 서버(server/src/lib/quote.js)와 같은 규칙. 저장되는 예상 요금은 서버가 다시 계산한다.
export const SPEED_ORDER = ["100M", "200M", "500M", "1G"];
export const SERVICE_KEYS = ["internet", "internet_tv", "internet_tv_usim"];

/** 통신사에 실제 있는 속도 분류 (작은 순) */
export function speedsOf(carrier) {
  const set = new Set(carrier.priceTable.rows.map((r) => r.speed).filter(Boolean));
  return SPEED_ORDER.filter((s) => set.has(s));
}

/** 예상 월요금 { price, from } 또는 null('상담 시 안내') */
export function estimate(carrier, service, speed) {
  const rows = carrier.priceTable.rows.filter((r) => r.speed === speed);
  const vals = service === "internet" ? rows.map((r) => r.internetOnly) : rows.flatMap((r) => r.prices);
  const nums = vals.filter((v) => Number.isFinite(v) && v > 0);
  if (!nums.length) return null;
  return { price: Math.min(...nums), from: service !== "internet" || nums.length > 1 };
}

/** 상담 운영시간 안인지 (한국시간, 사업자 정보의 시작·종료 시간·요일) */
export function isOpenNow(business, now = new Date()) {
  const { openTime, closeTime, openDays } = business || {};
  if (!openTime || !closeTime) return false;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false })
      .formatToParts(now).map((p) => [p.type, p.value])
  );
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  if (Array.isArray(openDays) && !openDays.includes(day)) return false;
  const hm = `${parts.hour === "24" ? "00" : parts.hour}:${parts.minute}`;
  return openTime <= closeTime ? hm >= openTime && hm < closeTime : hm >= openTime || hm < closeTime;
}

/**
 * 접수 창에서 고른 요금제의 월요금 (서버 planPrice 와 같은 규칙).
 * 인터넷만: 인터넷 단독 요금, TV 포함: 요금표 칸(행=인터넷, 열=TV). 없으면 null('상담 시 안내')
 */
export function planPrice(carrier, service, internetPlan, tvPlan) {
  const row = carrier.priceTable.rows.find((r) => r.internet === internetPlan);
  if (!row) return null;
  if (service === "internet") return Number.isFinite(row.internetOnly) && row.internetOnly > 0 ? row.internetOnly : null;
  const j = carrier.priceTable.tvPlans.indexOf(tvPlan);
  const v = j >= 0 ? row.prices[j] : null;
  return Number.isFinite(v) && v > 0 ? v : null;
}
