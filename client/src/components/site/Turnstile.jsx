import { useEffect, useRef } from "react";

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading = null;
function loadScript() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SRC;
      s.async = true;
      s.onload = () => resolve(window.turnstile);
      s.onerror = () => { loading = null; reject(new Error("자동 등록 방지 확인을 불러오지 못했습니다.")); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

/**
 * Cloudflare Turnstile (무료 캡차). siteKey 가 없으면 아무것도 그리지 않는다 (서버도 확인 생략).
 * resetKey 가 바뀌면 다시 확인 (제출 실패 후 토큰 재발급).
 */
export default function Turnstile({ siteKey, onToken, resetKey = 0 }) {
  const ref = useRef(null);
  const idRef = useRef(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!siteKey) return undefined;
    let alive = true;
    loadScript()
      .then((ts) => {
        if (!alive || !ref.current) return;
        idRef.current = ts.render(ref.current, {
          sitekey: siteKey,
          language: "ko",
          callback: (t) => cb.current(t),
          "expired-callback": () => cb.current(""),
          "error-callback": () => cb.current(""),
        });
      })
      .catch(() => cb.current(""));
    return () => {
      alive = false;
      if (idRef.current != null && window.turnstile) window.turnstile.remove(idRef.current);
      idRef.current = null;
    };
  }, [siteKey]);

  useEffect(() => {
    if (resetKey && idRef.current != null && window.turnstile) {
      window.turnstile.reset(idRef.current);
      cb.current("");
    }
  }, [resetKey]);

  if (!siteKey) return null;
  return <div ref={ref} className="ts-box" />;
}
