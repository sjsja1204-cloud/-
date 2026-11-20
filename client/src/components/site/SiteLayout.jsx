import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import SiteHeader from "./SiteHeader";
import Footer from "./Footer";
import FloatingButtons from "./FloatingButtons";
import { captureAttribution } from "../../lib/utm";
import "./site.css";

/** 고객용 페이지 공통 틀 (헤더 + 본문 + 푸터 + 플로팅 버튼) */
export default function SiteLayout({ children, title }) {
  const { pathname } = useLocation();
  useEffect(() => {
    captureAttribution();
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  useEffect(() => {
    document.title = title ? `${title} | 담아가넷` : "담아가넷 | 휴대폰·인터넷·TV 가입 상담";
  }, [title]);

  return (
    <div className="site">
      <SiteHeader />
      <main>{children}</main>
      <Footer />
      <FloatingButtons />
    </div>
  );
}
