import { Link } from "react-router-dom";
import { useSiteData, useMenu } from "../../lib/siteData";

/** 푸터: 메뉴 + 사업자 정보(관리자 > 사이트 설정) 중 비어 있지 않은 것만 표시 */
export default function Footer() {
  const { business } = useSiteData();
  const menu = useMenu();
  // 하위 메뉴 없는 항목은 "바로가기" 한 칸으로 모음
  const singles = menu.filter((m) => !m.children.length);
  const cols = [...(singles.length ? [{ label: "바로가기", children: singles }] : []), ...menu.filter((m) => m.children.length)];
  const items = [
    ["상호", business.name],
    ["대표자", business.ceo],
    ["주소", business.address],
    ["사업자등록번호", business.bizNumber],
    ["통신판매업 신고번호", business.ecommerceNumber],
    ["대표번호", business.phone],
    ["이메일", business.email],
    ["상담시간", business.hours],
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
          {cols.map((m, i) => (
            <div key={i} className="footer-col">
              <b>{m.label}</b>
              {m.children.map((c) => (/^https?:/.test(c.to)
                ? <a key={c.to + c.label} href={c.to} target="_blank" rel="noopener noreferrer">{c.label}</a>
                : <Link key={c.to + c.label} to={c.to}>{c.label}</Link>))}
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
