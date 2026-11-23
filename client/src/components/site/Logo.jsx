import { Link } from "react-router-dom";
import { useSiteData } from "../../lib/siteData";

export default function Logo({ to = "/", suffix }) {
  const { business } = useSiteData();
  return (
    <Link to={to} className="logo" aria-label={`${business.name} 홈`}>
      <img src="/logo.png" alt="" width="51" height="34" />
      <span>
        {business.name}
        {suffix && <b> {suffix}</b>}
      </span>
    </Link>
  );
}
