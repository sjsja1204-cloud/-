import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import Logo from "./Logo";
import Icon from "./Icon";
import { useSiteData, useMenu } from "../../lib/siteData";

/** 지금 보고 있는 메뉴인지 (자기 링크 또는 하위 링크) */
function matches(pathname, to) {
  if (!to || !to.startsWith("/")) return false;
  return pathname === to || pathname.startsWith(to.replace(/\/$/, "") + "/");
}
const isCurrent = (pathname, m) => matches(pathname, m.to) || (m.children || []).some((c) => matches(pathname, c.to));
/** 하위 메뉴 중 지금 위치 (/support 와 /support/qna 가 같이 맞으면 더 긴 쪽 하나만) */
const currentChild = (pathname, children) =>
  children.filter((c) => matches(pathname, c.to)).sort((a, b) => b.to.length - a.to.length)[0] || null;

/** 메뉴 링크: 내부 경로는 Link, https:// 는 새 창 */
function MenuLink({ to, children, ...rest }) {
  if (/^https?:\/\//.test(to)) return <a href={to} target="_blank" rel="noopener noreferrer" {...rest}>{children}</a>;
  return <Link to={to} {...rest}>{children}</Link>;
}

/**
 * 상단 헤더 — 메뉴는 관리자 > 메인 화면 > 상단 메뉴.
 * PC: 마우스를 올리거나 클릭하면 드롭다운. 모바일: 햄버거 → 오른쪽 전체 메뉴(하위는 아코디언).
 */
export default function SiteHeader() {
  const { business } = useSiteData();
  const menu = useMenu();
  const { pathname } = useLocation();
  const [drawer, setDrawer] = useState(false);
  const burgerRef = useRef(null);

  useEffect(() => setDrawer(false), [pathname]);

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
          <ul className="gnb-list">
            {menu.map((m, i) => (
              <li key={i} className="gnb-item">
                {m.children.length ? (
                  <Dropdown item={m} current={isCurrent(pathname, m)} pathname={pathname} />
                ) : (
                  <MenuLink to={m.to} className={`gnb-link ${isCurrent(pathname, m) ? "on" : ""}`}
                    aria-current={isCurrent(pathname, m) ? "page" : undefined}>
                    {m.label}
                  </MenuLink>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <Link to="/apply" className="btn btn-primary btn-sm sh-cta">무료 상담</Link>
        <button ref={burgerRef} type="button" className="sh-burger" aria-label="전체 메뉴 열기" aria-expanded={drawer}
          aria-controls="mnav" onClick={() => setDrawer(true)}>
          <Icon name="menu" />
        </button>
      </div>
      {drawer && <MobileNav menu={menu} pathname={pathname} onClose={() => { setDrawer(false); burgerRef.current?.focus(); }} />}
    </header>
  );
}

/** PC 드롭다운: 마우스 올리면 열림, 클릭·Enter 로 열고 닫음, ESC·바깥 클릭·포커스 이탈 시 닫힘 */
function Dropdown({ item, current, pathname }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => !wrapRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  useEffect(() => () => clearTimeout(timer.current), []);

  // 마우스로 열린 직후의 클릭은 닫지 않고 그대로 열어 둔다 (hover → click 순서로 오기 때문)
  const hoverOpened = useRef(false);
  const focusFirst = useRef(false);
  useEffect(() => {
    if (open && focusFirst.current) {
      focusFirst.current = false;
      wrapRef.current?.querySelector(".gnb-drop a")?.focus();
    }
    if (!open) hoverOpened.current = false;
  }, [open]);

  const enter = () => {
    clearTimeout(timer.current);
    if (!open) hoverOpened.current = true;
    setOpen(true);
  };
  const leave = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 150); };
  const onClick = () => {
    if (open && hoverOpened.current) { hoverOpened.current = false; return; }
    setOpen((v) => !v);
  };
  const onKeyDown = (e) => {
    if (e.key === "Escape" && open) { e.stopPropagation(); setOpen(false); btnRef.current?.focus(); }
    if (e.key === "ArrowDown" && e.target === btnRef.current) {
      e.preventDefault();
      hoverOpened.current = false;
      if (open) wrapRef.current?.querySelector(".gnb-drop a")?.focus();
      else { focusFirst.current = true; setOpen(true); }
    }
  };
  const onBlur = (e) => { if (!wrapRef.current?.contains(e.relatedTarget)) setOpen(false); };

  return (
    <div ref={wrapRef} className="gnb-dd" onMouseEnter={enter} onMouseLeave={leave} onKeyDown={onKeyDown} onBlur={onBlur}>
      <button ref={btnRef} type="button" className={`gnb-link ${current || open ? "on" : ""}`}
        aria-expanded={open} aria-haspopup="true" aria-controls={id} onClick={onClick}>
        {item.label}
        <Icon name="chevronDown" size={15} className="gnb-caret" />
      </button>
      <ul id={id} className={`gnb-drop ${open ? "open" : ""}`} hidden={!open}>
        {item.to && (
          <li><MenuLink to={item.to} className={matches(pathname, item.to) && pathname === item.to ? "on" : ""}>{item.label} 전체</MenuLink></li>
        )}
        {item.children.map((c, k) => {
          const on = c === currentChild(pathname, item.children);
          return (
            <li key={k}>
              <MenuLink to={c.to} className={on ? "on" : ""} aria-current={on ? "page" : undefined}>
                {c.label}
              </MenuLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** 모바일 전체 메뉴: 오른쪽에서 열림, 하위 메뉴는 아코디언, 하단에 상담 신청·대표번호 */
function MobileNav({ menu, pathname, onClose }) {
  const { business, openConsult } = useSiteData();
  const panelRef = useRef(null);
  const [expanded, setExpanded] = useState(() => menu.findIndex((m) => m.children.length && isCurrent(pathname, m)));
  const tel = (business.phone || "").replace(/[^\d+]/g, "");

  const trap = useCallback((e) => {
    if (e.key === "Escape") onClose();
    if (e.key !== "Tab" || !panelRef.current) return;
    const f = [...panelRef.current.querySelectorAll("a[href], button:not([disabled])")];
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }, [onClose]);

  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector(".mnav-close")?.focus();
    document.addEventListener("keydown", trap);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", trap);
    };
  }, [trap]);

  return (
    <div className="mnav-dim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside id="mnav" ref={panelRef} className="mnav" role="dialog" aria-modal="true" aria-label="전체 메뉴">
        <div className="mnav-head">
          <Logo />
          <button type="button" className="sh-burger mnav-close" aria-label="메뉴 닫기" onClick={onClose}><Icon name="close" /></button>
        </div>
        <nav aria-label="전체 메뉴">
          <ul className="mnav-list">
            {menu.map((m, i) => {
              const cur = isCurrent(pathname, m);
              if (!m.children.length) {
                return (
                  <li key={i}>
                    <MenuLink to={m.to} className={`mnav-link ${cur ? "on" : ""}`} aria-current={cur ? "page" : undefined}>
                      {m.label}<Icon name="chevronRight" size={18} />
                    </MenuLink>
                  </li>
                );
              }
              const open = expanded === i;
              const pid = `mnav-sub-${i}`;
              return (
                <li key={i}>
                  <button type="button" className={`mnav-link ${cur || open ? "on" : ""}`} aria-expanded={open} aria-controls={pid}
                    onClick={() => setExpanded(open ? -1 : i)}>
                    {m.label}<Icon name="chevronDown" size={18} className="mnav-caret" />
                  </button>
                  <ul id={pid} className="mnav-sub" hidden={!open}>
                    {m.to && <li><MenuLink to={m.to} className={pathname === m.to ? "on" : ""}>{m.label} 전체</MenuLink></li>}
                    {m.children.map((c, k) => {
                      const on = c === currentChild(pathname, m.children);
                      return (
                        <li key={k}>
                          <MenuLink to={c.to} className={on ? "on" : ""} aria-current={on ? "page" : undefined}>{c.label}</MenuLink>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mnav-foot">
          <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => { onClose(); openConsult("consult"); }}>
            상담 신청
          </button>
          {tel && (
            <a href={`tel:${tel}`} className="btn btn-lg btn-block mnav-call">
              <Icon name="phoneCall" size={18} /> {business.phone}
            </a>
          )}
        </div>
      </aside>
    </div>
  );
}
