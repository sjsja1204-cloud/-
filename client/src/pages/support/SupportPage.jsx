import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import SiteLayout from "../../components/site/SiteLayout";
import PageHero from "../../components/site/PageHero";
import Icon from "../../components/site/Icon";
import { useSiteData } from "../../lib/siteData";
import { useFaqs } from "../../lib/reviews";

/**
 * 고객센터 (/support): 대표번호·운영시간·카카오톡 채널·상담 신청 → 자주 묻는 질문(카테고리 탭, 아코디언) → 이메일·약관 링크.
 * 값이 비어 있는 항목은 표시하지 않는다 (관리자 > 사이트 설정 > 사업자 정보, 관리자 > 자주 묻는 질문).
 */
export default function SupportPage() {
  const { business, openConsult } = useSiteData();
  const faqs = useFaqs();
  const { hash } = useLocation();
  const [cat, setCat] = useState("");
  const [open, setOpen] = useState(null);
  const tel = (business.phone || "").replace(/[^\d+]/g, "");
  const list = cat ? faqs.items.filter((f) => f.category === cat) : faqs.items;

  // /support#q12 로 오면 그 질문을 펼쳐서 보여줌
  useEffect(() => {
    const m = hash.match(/^#q(\d+)$/);
    if (m && faqs.items.length) {
      setCat("");
      setOpen(Number(m[1]));
      setTimeout(() => document.getElementById(`q${m[1]}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    }
  }, [hash, faqs.items.length]);

  return (
    <SiteLayout title="고객센터">
      <PageHero title="고객센터" desc="궁금한 점은 상담 신청이나 전화로 편하게 문의해 주세요." crumbs={[["고객센터"]]} />

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

          <h2 className="cs-h2" id="faq">자주 묻는 질문</h2>
          {faqs.items.length > 0 && (
            <div className="chip-filter" role="group" aria-label="질문 분류">
              {["", ...faqs.categories].map((c) => (
                <button key={c || "all"} type="button" className={`chip ${cat === c ? "on" : ""}`} aria-pressed={cat === c} onClick={() => { setCat(c); setOpen(null); }}>
                  {c || "전체"}
                </button>
              ))}
            </div>
          )}
          {list.length > 0 && (
            <div className="faq">
              {list.map((f) => {
                const on = open === f.id;
                return (
                  <div key={f.id} id={`q${f.id}`} className={`faq-item ${on ? "open" : ""}`}>
                    <button type="button" aria-expanded={on} aria-controls={`qa${f.id}`} onClick={() => setOpen(on ? null : f.id)}>
                      <b>Q</b><span>{f.question}</span><Icon name="chevronDown" size={18} />
                    </button>
                    <div id={`qa${f.id}`} className="faq-a" hidden={!on}><b>A</b><p>{f.answer}</p></div>
                  </div>
                );
              })}
            </div>
          )}
          {!faqs.loading && !list.length && (
            <div className="empty-box">{faqs.items.length ? "이 분류에는 아직 질문이 없습니다." : "자주 묻는 질문을 준비 중입니다. 궁금한 점은 상담 신청으로 문의해 주세요."}</div>
          )}

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
