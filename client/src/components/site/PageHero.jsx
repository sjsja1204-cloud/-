import { Link, NavLink } from "react-router-dom";
import Icon from "./Icon";

/**
 * 서브페이지 상단: 제목 + 경로 + 같은 카테고리 탭
 * crumbs = [[label, to?], ...], tabs = [{label, to}]
 */
export default function PageHero({ title, desc, crumbs = [], tabs }) {
  return (
    <>
      <section className="ph">
        <div className="site-inner">
          <nav className="ph-crumbs" aria-label="현재 위치">
            <Link to="/">홈</Link>
            {crumbs.map(([label, to]) => (
              <span key={label}>
                <Icon name="chevronRight" size={12} />
                {to ? <Link to={to}>{label}</Link> : label}
              </span>
            ))}
          </nav>
          <h1>{title}</h1>
          {desc && <p>{desc}</p>}
        </div>
      </section>
      {tabs && (
        <div className="ph-tabs">
          <div className="site-inner ph-tabs-row">
            {tabs.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.end !== false}>{t.label}</NavLink>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
