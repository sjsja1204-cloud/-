import { Link } from "react-router-dom";
import { useSiteData } from "../../lib/siteData";

export default function Logo({ to = "/", suffix }) {
  const { business } = useSiteData();
  return (
    <Link to={to} className="logo" aria-label={`${business.name} 홈`}>
      <img src="/logo-mark.png" alt="" width="210" height="130" />
      <span className="logo-text">
        {/* 상호 마지막 글자(넷)는 브랜드 색 */}
        {business.name.slice(0, -1)}
        <em className="logo-accent">{business.name.slice(-1)}</em>
        {suffix && <b> {suffix}</b>}
      </span>
    </Link>
  );
}
