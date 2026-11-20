// 유입경로 수집: 첫 진입 시 URL 의 utm_* 와 외부 referrer 를 세션에 저장해 두고 접수 시 함께 보낸다.
const KEY = "dg_attribution";

export function captureAttribution() {
  try {
    const params = new URLSearchParams(window.location.search);
    const hasUtm = ["utm_source", "utm_medium", "utm_campaign"].some((k) => params.get(k));
    const saved = sessionStorage.getItem(KEY);
    if (saved && !hasUtm) return; // 같은 세션에서는 최초 유입 유지 (새 utm 링크로 들어오면 갱신)
    const ref = document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer : "";
    sessionStorage.setItem(
      KEY,
      JSON.stringify({
        utmSource: params.get("utm_source") || "",
        utmMedium: params.get("utm_medium") || "",
        utmCampaign: params.get("utm_campaign") || "",
        referrer: ref.slice(0, 1000),
      })
    );
  } catch {
    /* 저장소 차단 시 무시 */
  }
}

export function getAttribution() {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) || "{}");
    return v;
  } catch {
    return {};
  }
}
