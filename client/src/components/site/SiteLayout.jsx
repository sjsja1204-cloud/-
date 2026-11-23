import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import SiteHeader from "./SiteHeader";
import Footer from "./Footer";
import QuickMenu from "./QuickMenu";
import ConsultModal from "./ConsultModal";
import { captureAttribution } from "../../lib/utm";
import { useSiteData } from "../../lib/siteData";
import "./site.css";

/** 고객용 페이지 공통 틀 (헤더 + 본문 + 푸터 + 빠른 상담 메뉴 + 공통 접수 창) */
export default function SiteLayout({ children, title }) {
  const { pathname } = useLocation();
  const { preview, exitPreview, business } = useSiteData();
  useEffect(() => {
    captureAttribution();
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  useEffect(() => {
    const name = business.name || "담아가넷";
    document.title = title ? `${title} | ${name}` : `${name} | 휴대폰·인터넷·TV 가입 상담`;
  }, [title, business.name]);

  return (
    <div className="site">
      {preview && (
        <div className="preview-bar" role="status">
          <b>미리보기 화면</b> · 임시저장한 내용이 보입니다. 아직 고객에게는 보이지 않아요.
          <button onClick={exitPreview}>미리보기 끝내기</button>
        </div>
      )}
      <SiteHeader />
      <main>{children}</main>
      <Footer />
      <QuickMenu />
      <ConsultModal />
    </div>
  );
}
