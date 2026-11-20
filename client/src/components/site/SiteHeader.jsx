import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import Logo from "./Logo";
import Icon from "./Icon";
import { menu } from "../../config/site";
import { business } from "../../config/business";

/** 상단 헤더: PC 는 드롭다운 메뉴, 모바일은 햄버거 → 전체 메뉴 */
export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const isActive = (item) => loc.pathname === item.to || loc.pathname.startsWith(item.to.split("/").slice(0, 2).join("/") + "/") || item.children?.some((c) => c.to === loc.pathname);

  return (
    <header className="sh">
      <div className="sh-top">
        <div className="site-inner sh-top-row">
          <span>휴대폰 · 인터넷 · TV 가입 상담은 <b>{business.name}</b></span>
          {business.phone && <a href={`tel:${business.phone}`}>대표번호 {business.phone}</a>}
        </div>
      </div>
      <div className="site-inner sh-row">
        <Logo />
        <nav className="gnb" aria-label="주 메뉴">
          {menu.map((m) => (
            <div key={m.label} className={`gnb-item ${isActive(m) ? "active" : ""}`}>
              <NavLink to={m.to} className="gnb-link">
                {m.label}
                {m.children && <Icon name="chevronDown" size={14} />}
              </NavLink>
              {m.children && (
                <div className="gnb-drop">
                  {m.children.map((c) => (
                    <Link key={c.to} to={c.to}>{c.label}</Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <Link to="/apply" className="btn btn-primary btn-sm sh-cta">무료 상담</Link>
        <button className="sh-burger" aria-label="전체 메뉴" aria-expanded={open} onClick={() => setOpen(true)}>
          <Icon name="menu" />
        </button>
      </div>

      {open && (
        <div className="mnav-dim" onClick={() => setOpen(false)}>
          <aside className="mnav" onClick={(e) => e.stopPropagation()} aria-label="전체 메뉴">
            <div className="mnav-head">
              <Logo />
              <button className="sh-burger" aria-label="메뉴 닫기" onClick={() => setOpen(false)}><Icon name="close" /></button>
            </div>
            <Link to="/apply" className="btn btn-primary btn-block btn-lg">무료 상담 신청</Link>
            {business.phone && <a href={`tel:${business.phone}`} className="btn btn-block btn-lg" style={{ marginTop: 8 }}>전화 상담 {business.phone}</a>}
            <nav className="mnav-list">
              {menu.map((m) => (
                <div key={m.label} className="mnav-group">
                  <Link to={m.to} className="mnav-title">{m.label}</Link>
                  {m.children && (
                    <div className="mnav-sub">
                      {m.children.map((c) => <Link key={c.to} to={c.to}>{c.label}</Link>)}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </header>
  );
}
