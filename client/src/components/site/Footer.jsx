import { Link } from "react-router-dom";
import { business } from "../../config/business";
import { menu } from "../../config/site";

/** 푸터: 메뉴 + business.js 의 값 중 비어 있지 않은 것만 표시 */
export default function Footer() {
  const items = [
    ["상호", business.name],
    ["대표자", business.ceo],
    ["주소", business.address],
    ["사업자등록번호", business.bizNumber],
    ["통신판매업 신고번호", business.ecommerceNumber],
    ["대표번호", business.phone],
    ["이메일", business.email],
  ].filter(([, v]) => v && String(v).trim());

  return (
    <footer className="site-footer">
      <div className="site-inner">
        <div className="footer-grid">
          <div className="footer-brand">
            <b>{business.name}</b>
            <p>휴대폰 · 인터넷 · TV 가입을 비교하고<br />최대 혜택으로 상담해 드립니다.</p>
            <Link to="/apply" className="btn btn-primary btn-sm">무료 상담 신청</Link>
          </div>
          {menu.map((m) => (
            <div key={m.label} className="footer-col">
              <b>{m.label}</b>
              {(m.children || [m]).map((c) => <Link key={c.to + c.label} to={c.to}>{c.label}</Link>)}
            </div>
          ))}
        </div>
        <nav className="footer-links">
          <Link to="/privacy"><b>개인정보처리방침</b></Link>
          <Link to="/terms">이용약관</Link>
        </nav>
        <ul className="footer-info">
          {items.map(([k, v]) => (
            <li key={k}>
              <span>{k}</span> {k === "이메일" ? <a href={`mailto:${v}`}>{v}</a> : k === "대표번호" ? <a href={`tel:${v}`}>{v}</a> : v}
            </li>
          ))}
        </ul>
        <p className="footer-copy">© {new Date().getFullYear()} {business.name}. All rights reserved.</p>
      </div>
    </footer>
  );
}
