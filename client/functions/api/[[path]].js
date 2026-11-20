// Cloudflare Pages Functions: /api/* 요청을 Render 백엔드로 그대로 전달하는 프록시.
// 프론트와 API 가 같은 도메인이 되어 httpOnly 쿠키가 1st-party 로 동작한다 (Safari 등 3rd-party 쿠키 차단 회피).
// Pages 프로젝트 환경변수 API_ORIGIN = https://<render-service>.onrender.com
export async function onRequest({ request, env }) {
  if (!env.API_ORIGIN) return new Response(JSON.stringify({ error: "API_ORIGIN 미설정" }), { status: 500 });
  const url = new URL(request.url);
  const target = env.API_ORIGIN.replace(/\/$/, "") + url.pathname + url.search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  // 실제 고객 IP 전달 (백엔드 TRUST_PROXY=2 와 짝)
  headers.set("X-Forwarded-For", request.headers.get("CF-Connecting-IP") || "");

  const init = { method: request.method, headers, redirect: "manual" };
  if (!["GET", "HEAD"].includes(request.method)) init.body = request.body;
  return fetch(target, init);
}
