import { Link } from "react-router-dom";
import { carriers, formatWon } from "../plans/telecomPlans";
import { carrierPages } from "../../config/site";
import Icon from "./Icon";

/** 통신사별 최저 요금 카드 (요금 데이터는 telecomPlans.js 에서 계산) */
export default function CarrierCards() {
  return (
    <div className="cc-grid">
      {carriers.map((c) => {
        const page = carrierPages[c.id] || { name: c.name, color: "#f26a21" };
        const min = Math.min(...c.priceTable.rows.flatMap((r) => r.prices));
        const speeds = c.priceTable.rows.map((r) => r.internet).join(" · ");
        return (
          <Link key={c.id} to={`/internet/${c.id}`} className="cc" style={{ "--brand": page.color }}>
            <span className="cc-name">{page.name}</span>
            <span className="cc-tag">{page.tagline}</span>
            <span className="cc-price"><small>인터넷+TV 월</small> <b>{formatWon(min)}</b><small>~</small></span>
            <span className="cc-speeds">{speeds}</span>
            <span className="cc-more">요금표 보기 <Icon name="chevronRight" size={16} /></span>
          </Link>
        );
      })}
    </div>
  );
}
