import Logo from "./Logo";
import Footer from "./Footer";
import "./site.css";

/** 고객용 페이지 공통 틀 (헤더 + 본문 + 푸터) */
export default function SiteLayout({ children, headerRight }) {
  return (
    <div className="site">
      <header className="site-header">
        <div className="site-inner site-header-row">
          <Logo />
          {headerRight}
        </div>
      </header>
      <main>{children}</main>
      <Footer />
    </div>
  );
}
