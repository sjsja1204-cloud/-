import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import SiteLayout from "../components/site/SiteLayout";
import HeroSlider from "../components/site/HeroSlider";
import LiveTicker from "../components/site/LiveTicker";
import CarrierCards from "../components/site/CarrierCards";
import ProcessSteps from "../components/site/ProcessSteps";
import ReviewCard from "../components/site/ReviewCard";
import ApplySection from "../components/site/ApplySection";
import QuoteWidget from "../components/site/QuoteWidget";
import EventPopup from "../components/site/EventPopup";
import Icon from "../components/site/Icon";
import { usePosts, fmtDay } from "../lib/posts";
import { useSiteData } from "../lib/siteData";

const QUICK = [
  { to: "/internet", icon: "wifi", title: "인터넷·TV", desc: "통신사별 요금 비교" },
  { to: "/mobile", icon: "phone", title: "휴대폰", desc: "번호이동·기기변경" },
  { to: "/bundle", icon: "link", title: "결합할인", desc: "가족 결합 할인 계산" },
  { to: "/event", icon: "gift", title: "이벤트", desc: "진행 중인 혜택" },
];


export default function Home() {
  const { benefits, status } = useSiteData();
  const { state } = useLocation();
  // 다른 페이지에서 빠른 메뉴 "상품 찾기"로 왔을 때 간편 견적 위치로
  useEffect(() => {
    if (state?.scrollTo && status === "ready") document.getElementById(state.scrollTo)?.scrollIntoView({ behavior: "smooth" });
  }, [state, status]);
  const reviews = usePosts("review", { pageSize: 3 });
  const notices = usePosts("notice", { pageSize: 4 });
  const faqs = usePosts("faq", { pageSize: 4 });

  return (
    <SiteLayout>
      <HeroSlider />
      <QuoteWidget />

      <section className="quick">
        <div className="site-inner quick-grid">
          {QUICK.map((q) => (
            <Link key={q.to} to={q.to} className="quick-item">
              <span className="quick-ic"><Icon name={q.icon} size={26} /></span>
              <b>{q.title}</b>
              <span>{q.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="sec">
        <div className="site-inner live-grid">
          <LiveTicker />
          <div className="why">
            {benefits.kicker && <p className="sec-kicker">{benefits.kicker}</p>}
            <h2 className="sec-title">{benefits.title.split("\n").map((l, j) => <span key={j}>{j > 0 && <br />}{l}</span>)}</h2>
            <ul>
              {benefits.items.map((w, k) => (
                <li key={k}>
                  <span className="why-ic"><Icon name={w.icon} /></span>
                  <div><b>{w.title}</b><p>{w.desc}</p></div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="sec sec-soft">
        <div className="site-inner">
          <div className="sec-head">
            <div>
              <p className="sec-kicker">PRICE</p>
              <h2 className="sec-title">통신사별 인터넷 + TV 요금</h2>
            </div>
            <Link to="/internet" className="more">전체 비교 <Icon name="chevronRight" size={16} /></Link>
          </div>
          <CarrierCards />
          <p className="hint" style={{ marginTop: 10 }}>※ 와이파이 공유기 포함 월 요금 기준이며, 결합 여부·약정 조건에 따라 달라질 수 있습니다.</p>
        </div>
      </section>

      <section className="sec">
        <div className="site-inner">
          <p className="sec-kicker" style={{ textAlign: "center" }}>PROCESS</p>
          <h2 className="sec-title" style={{ textAlign: "center" }}>가입까지 4단계면 충분해요</h2>
          <ProcessSteps />
        </div>
      </section>

      <section className="sec sec-soft">
        <div className="site-inner">
          <div className="sec-head">
            <div>
              <p className="sec-kicker">REVIEW</p>
              <h2 className="sec-title">상담 고객 후기</h2>
            </div>
            <Link to="/support/reviews" className="more">후기 더보기 <Icon name="chevronRight" size={16} /></Link>
          </div>
          {reviews.items.length ? (
            <div className="rv-grid">{reviews.items.map((p) => <ReviewCard key={p.id} post={p} />)}</div>
          ) : (
            <div className="empty-box">{reviews.loading ? "불러오는 중…" : "곧 고객님들의 후기가 올라옵니다."}</div>
          )}
        </div>
      </section>

      <section className="sec">
        <div className="site-inner board-grid">
          <div className="board-box">
            <div className="sec-head sm">
              <h3>공지사항</h3>
              <Link to="/support/notice" className="more">더보기 <Icon name="chevronRight" size={14} /></Link>
            </div>
            <ul className="board-list">
              {notices.items.map((n) => (
                <li key={n.id}><Link to={`/support/notice/${n.id}`}>{n.is_pinned && <span className="badge badge-accent">공지</span>} {n.title}</Link><span>{fmtDay(n.created_at)}</span></li>
              ))}
              {!notices.loading && !notices.items.length && <li className="hint">등록된 공지가 없습니다.</li>}
            </ul>
          </div>
          <div className="board-box">
            <div className="sec-head sm">
              <h3>자주 묻는 질문</h3>
              <Link to="/support/faq" className="more">더보기 <Icon name="chevronRight" size={14} /></Link>
            </div>
            <ul className="board-list">
              {faqs.items.map((f) => (
                <li key={f.id}><Link to={`/support/faq#q${f.id}`}><b style={{ color: "var(--brand)" }}>Q.</b> {f.title}</Link></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <ApplySection />
      <EventPopup />
    </SiteLayout>
  );
}
