import { Link } from "react-router-dom";
import { formatWon } from "../../lib/format";
import { useSiteData, minPrice } from "../../lib/siteData";
import Icon from "./Icon";

/** 통신사별 최저 요금 카드 (요금 데이터는 관리자 > 요금표 관리) */
export default function CarrierCards() {
  const { carriers, status } = useSiteData();
  if (status === "loading") return <div className="cc-grid" aria-busy="true" />;
  return (
    <div className="cc-grid">
      {carriers.map((c) => {
        const min = minPrice(c);
        const speeds = c.priceTable.rows.map((r) => r.internet).join(" · ");
        return (
          <Link key={c.id} to={`/internet/${c.id}`} className="cc">
            <span className="cc-name">{c.logo ? <img src={c.logo} alt="" className="cc-logo" /> : null}{c.name}</span>
            <span className="cc-tag">{c.tagline}</span>
            {min != null ? <span className="cc-price"><small>인터넷+TV 월</small> <b>{formatWon(min)}</b><small>~</small></span> : <span className="cc-price soon">요금 정보 준비중</span>}
            <span className="cc-speeds">{speeds}</span>
            <span className="cc-more">요금표 보기 <Icon name="chevronRight" size={16} /></span>
          </Link>
        );
      })}
    </div>
  );
}
