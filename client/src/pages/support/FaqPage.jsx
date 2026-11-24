import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import SiteLayout from "../../components/site/SiteLayout";
import PageHero from "../../components/site/PageHero";
import Icon from "../../components/site/Icon";
import { useFaqs } from "../../lib/reviews";
import { csTabs } from "./csTabs";
import "./qna.css";

/** 고객센터 > 자주 묻는 질문 (/support/faq): 분류 탭 + 아코디언. 관리자 > 자주 묻는 질문 */
export default function FaqPage() {
  const faqs = useFaqs();
  const { hash } = useLocation();
  const [cat, setCat] = useState("");
  const [open, setOpen] = useState(null);
  const list = cat ? faqs.items.filter((f) => f.category === cat) : faqs.items;

  // /support/faq#q12 로 오면 그 질문을 펼쳐서 보여줌
  useEffect(() => {
    const m = hash.match(/^#q(\d+)$/);
    if (m && faqs.items.length) {
      setCat("");
      setOpen(Number(m[1]));
      setTimeout(() => document.getElementById(`q${m[1]}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    }
  }, [hash, faqs.items.length]);

  return (
    <SiteLayout title="자주 묻는 질문">
      <PageHero title="고객센터" crumbs={[["고객센터", "/support"], ["자주 묻는 질문"]]} tabs={csTabs} />
      <section className="sec">
        <div className="site-inner narrow">
          <h2 className="cs-h2 first" id="faq">자주 묻는 질문</h2>
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
            <div className="empty-box">{faqs.items.length ? "이 분류에는 아직 질문이 없습니다." : "자주 묻는 질문을 준비 중입니다. 궁금한 점은 질문/답변이나 상담 신청으로 문의해 주세요."}</div>
          )}

          <div className="cs-cta faq-more">
            <p>찾는 답이 없나요? 질문을 남겨 주시면 담아가넷이 답변드려요.</p>
            <Link to="/support/qna/write" className="btn btn-primary btn-lg">질문하기</Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
