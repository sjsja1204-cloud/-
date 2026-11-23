import { useLocation, useNavigate } from "react-router-dom";
import { useSiteData } from "../../lib/siteData";
import Icon from "./Icon";

const ICON = { subsidy: "badgePercent", consult: "messageSquare", recommend: "search", call: "phoneCall" };

/**
 * 빠른 상담 메뉴 — PC: 오른쪽 세로 고정 / 모바일: 하단 고정 바.
 * 문구·순서·켜기/끄기는 관리자 > 사이트 설정 > 빠른 상담 메뉴.
 */
export default function QuickMenu() {
  const { consult, business, quote, openConsult } = useSiteData();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const tel = (business.phone || "").replace(/[^\d+]/g, "");

  const items = (consult.menu || []).filter((m) => m.enabled && (m.type !== "call" || tel));
  if (!items.length) return null;

  const recommend = () => {
    const el = document.getElementById("quote");
    if (quote.enabled && el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.querySelector("button")?.focus({ preventScroll: true });
    } else if (quote.enabled && pathname !== "/") nav("/", { state: { scrollTo: "quote" } });
    else openConsult("recommend");
  };

  return (
    <nav className="qmenu" aria-label="빠른 상담">
      {items.map((m) => {
        const cls = `qm-btn qm-${m.type}`;
        const inner = (
          <>
            <Icon name={ICON[m.type]} size={22} />
            <span className="qm-label">{m.label}</span>
            {m.type === "call" && <span className="qm-sub">{business.phone}</span>}
          </>
        );
        if (m.type === "call") return <a key={m.type} className={cls} href={`tel:${tel}`} aria-label={`${m.label} ${business.phone}`}>{inner}</a>;
        return (
          <button key={m.type} type="button" className={cls} onClick={() => (m.type === "recommend" ? recommend() : openConsult(m.type))}>
            {inner}
          </button>
        );
      })}
    </nav>
  );
}
