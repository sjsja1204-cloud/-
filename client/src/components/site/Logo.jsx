import { Link } from "react-router-dom";
import { business } from "../../config/business";

export default function Logo({ to = "/", suffix }) {
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
