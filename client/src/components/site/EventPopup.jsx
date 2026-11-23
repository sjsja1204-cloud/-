import { useEffect, useState } from "react";
import { api } from "../../lib/api";

const KST_OFFSET = 9 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const storageKey = (id) => `dg_popup_hide_until_${id}`;

/** 한국시간 기준 다음 자정 (epoch ms) */
export function nextKstMidnight(now = Date.now()) {
  return Math.floor((now + KST_OFFSET) / DAY) * DAY + DAY - KST_OFFSET;
}

function hiddenToday(id) {
  try {
    const until = Number(localStorage.getItem(storageKey(id)) || 0);
    return until && Date.now() < until;
  } catch {
    return false; // 저장소 차단 시 매번 표시
  }
}

/**
 * 이벤트 팝업 (관리자 > 팝업 관리). 노출 기간·켜짐 여부는 서버가 판단.
 * 여러 개면 겹쳐서 순서대로 보여주고, 각각 '오늘 하루 보지 않기' 가능.
 */
export default function EventPopup() {
  const [list, setList] = useState([]);

  useEffect(() => {
    api("/popups")
      .then((d) => setList(d.items.filter((p) => !hiddenToday(p.id))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!list.length) return;
    const onKey = (e) => e.key === "Escape" && setList((l) => l.slice(1));
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [list.length]);

  if (!list.length) return null;

  const close = (id) => setList((l) => l.filter((p) => p.id !== id));
  const hideToday = (id) => {
    try {
      localStorage.setItem(storageKey(id), String(nextKstMidnight()));
    } catch {
      /* noop */
    }
    close(id);
  };
  const go = (p) => {
    close(p.id);
    if (p.link?.startsWith("#")) {
      document.getElementById(p.link.slice(1))?.scrollIntoView({ behavior: "smooth" });
    } else if (p.link?.startsWith("/")) {
      window.location.href = p.link;
    } else if (p.link) {
      window.open(p.link, "_blank", "noopener");
    }
  };

  return (
    <div className="popup-dim" role="dialog" aria-modal="true" aria-label="이벤트 안내" onClick={() => setList([])}>
      <div className="popup-stack" style={{ "--n": list.length }}>
        {list.map((p, k) => (
          <div key={p.id} className="popup" style={{ "--k": k, zIndex: list.length - k }} aria-hidden={k > 0}
            onClick={(e) => e.stopPropagation()}>
            {p.image_url ? (
              <button className="popup-img" onClick={() => go(p)} tabIndex={k ? -1 : 0}>
                <img src={p.image_url} alt={p.alt || p.title || "이벤트"} />
              </button>
            ) : (
              <div className="popup-body">
                <span className="badge badge-accent">EVENT</span>
                <h3>{p.title}</h3>
                {p.body.split("\n").filter(Boolean).map((l, i) => <p key={i}>{l}</p>)}
                {p.link && <button className="btn btn-primary btn-block" onClick={() => go(p)} tabIndex={k ? -1 : 0}>{p.button_text || "자세히 보기"}</button>}
              </div>
            )}
            <div className="popup-foot">
              <button onClick={() => hideToday(p.id)} tabIndex={k ? -1 : 0}>오늘 하루 보지 않기</button>
              <button onClick={() => close(p.id)} tabIndex={k ? -1 : 0}>닫기{list.length > 1 && k === 0 ? ` (${list.length - 1}개 더)` : ""}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
