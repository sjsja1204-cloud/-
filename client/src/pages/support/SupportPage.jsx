import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SiteLayout from "../../components/site/SiteLayout";
import PageHero from "../../components/site/PageHero";
import Icon from "../../components/site/Icon";
import { useSiteData } from "../../lib/siteData";
import { csTabs } from "./csTabs";
import "./qna.css";

/**
 * 고객센터 안내 (/support): 대표번호·운영시간·카카오톡 채널·상담 신청·이메일.
 * 자주 묻는 질문은 /support/faq, 질문/답변은 /support/qna. 값이 비어 있는 항목은 표시하지 않는다 (관리자 > 사이트 설정 > 사업자 정보).
 */
export default function SupportPage() {
  const { business, openConsult } = useSiteData();
  const { hash } = useLocation();
  const nav = useNavigate();
  const tel = (business.phone || "").replace(/[^\d+]/g, "");

  // 예전 주소 /support#faq, /support#q12 → 자주 묻는 질문
  useEffect(() => {
    if (hash === "#faq" || /^#q\d+$/.test(hash)) nav(`/support/faq${hash === "#faq" ? "" : hash}`, { replace: true });
  }, [hash, nav]);

  return (
    <SiteLayout title="고객센터">
      <PageHero title="고객센터" desc="궁금한 점은 상담 신청이나 전화로 편하게 문의해 주세요." crumbs={[["고객센터"]]} tabs={csTabs} />

      <section className="sec">
        <div className="site-inner narrow">
          <div className="cs-top">
            {tel && (
              <a className="cs-card" href={`tel:${tel}`}>
                <span className="cs-ic"><Icon name="phone" size={24} /></span>
                <span><small>대표번호</small><b>{business.phone}</b></span>
              </a>
            )}
            {business.hours && (
              <div className="cs-card">
                <span className="cs-ic"><Icon name="clock" size={24} /></span>
                <span><small>상담 운영시간</small><b className="cs-hours">{business.hours}</b></span>
              </div>
            )}
            {business.kakaoUrl && (
              <a className="cs-card" href={business.kakaoUrl} target="_blank" rel="noopener noreferrer">
                <span className="cs-ic"><Icon name="chat" size={24} /></span>
                <span><small>카카오톡 채널</small><b>채팅으로 문의하기</b></span>
              </a>
            )}
          </div>
          <div className="cs-cta">
            <p>조건을 남겨 주시면 상담사가 확인 후 연락드립니다.</p>
            <button type="button" className="btn btn-primary btn-lg" onClick={() => openConsult("consult")}>상담 신청</button>
          </div>

          <div className="cs-go">
            <Link to="/support/faq" className="cs-card">
              <span className="cs-ic"><Icon name="question" size={24} /></span>
              <span><small>자주 묻는 질문</small><b>많이 묻는 질문 모아보기</b></span>
              <Icon name="chevronRight" size={18} className="cs-go-arrow" />
            </Link>
            <Link to="/support/qna" className="cs-card">
              <span className="cs-ic"><Icon name="messageSquare" size={24} /></span>
              <span><small>질문/답변</small><b>궁금한 점 직접 물어보기</b></span>
              <Icon name="chevronRight" size={18} className="cs-go-arrow" />
            </Link>
          </div>

          <div className="cs-foot">
            {business.email && <p><Icon name="mail" size={18} /> 이메일 <a href={`mailto:${business.email}`}>{business.email}</a></p>}
            <p className="cs-links">
              <Link to="/support/notice">공지사항</Link>
              <Link to="/privacy"><b>개인정보처리방침</b></Link>
              <Link to="/terms">이용약관</Link>
            </p>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
