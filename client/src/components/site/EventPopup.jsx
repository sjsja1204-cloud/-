import { useEffect, useState } from "react";
import { popup } from "../../config/popup";

const KST_OFFSET = 9 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const storageKey = () => `dg_popup_hide_until_${popup.id}`;

/** 한국시간 기준 다음 자정 (epoch ms) */
export function nextKstMidnight(now = Date.now()) {
  return Math.floor((now + KST_OFFSET) / DAY) * DAY + DAY - KST_OFFSET;
}
const kstToday = () => new Date(Date.now() + KST_OFFSET).toISOString().slice(0, 10);

function shouldShow() {
  if (!popup.enabled) return false;
  const today = kstToday();
  if (popup.startDate && today < popup.startDate) return false;
  if (popup.endDate && today > popup.endDate) return false;
  try {
    const until = Number(localStorage.getItem(storageKey()) || 0);
    if (until && Date.now() < until) return false;
  } catch {
    /* 저장소 차단 시 매번 표시 */
  }
  return true;
}

export default function EventPopup() {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(shouldShow()), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const hideToday = () => {
    try {
      localStorage.setItem(storageKey(), String(nextKstMidnight()));
    } catch {
      /* noop */
    }
    setOpen(false);
  };
  const go = () => {
    setOpen(false);
    if (popup.link?.startsWith("#")) {
      document.getElementById(popup.link.slice(1))?.scrollIntoView({ behavior: "smooth" });
    } else if (popup.link) {
      window.open(popup.link, "_blank", "noopener");
    }
  };

  return (
    <div className="popup-dim" role="dialog" aria-modal="true" aria-label={popup.title || "이벤트"} onClick={() => setOpen(false)}>
      <div className="popup" onClick={(e) => e.stopPropagation()}>
        {popup.image ? (
          <button className="popup-img" onClick={go}>
            <img src={popup.image} alt={popup.imageAlt} />
          </button>
        ) : (
          <div className="popup-body">
            <span className="badge badge-accent">EVENT</span>
            <h3>{popup.title}</h3>
            {popup.lines?.map((l) => <p key={l}>{l}</p>)}
            <button className="btn btn-primary btn-block" onClick={go}>{popup.buttonText || "자세히 보기"}</button>
          </div>
        )}
        <div className="popup-foot">
          <button onClick={hideToday}>오늘 하루 보지 않기</button>
          <button onClick={() => setOpen(false)}>닫기</button>
        </div>
      </div>
    </div>
  );
}
