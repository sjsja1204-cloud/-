import { useEffect } from "react";
import SiteLayout from "../components/site/SiteLayout";
import LeadForm from "../components/site/LeadForm";
import EventPopup from "../components/site/EventPopup";
import FloatingButtons from "../components/site/FloatingButtons";
import PlanTables from "../components/plans/PlanTables";
import { business } from "../config/business";
import { captureAttribution } from "../lib/utm";

const scrollToForm = () => document.getElementById("apply")?.scrollIntoView({ behavior: "smooth" });

export default function Home() {
  useEffect(() => {
    captureAttribution();
    document.title = `${business.name} | 휴대폰·인터넷 가입 상담`;
  }, []);

  return (
    <SiteLayout headerRight={<button className="btn btn-primary btn-sm" onClick={scrollToForm}>상담 신청</button>}>
      <section className="hero">
        <div className="site-inner hero-row">
          <div className="hero-copy">
            <p className="hero-kicker">휴대폰 · 인터넷 · TV 개통 상담</p>
            <h1>
              휴대폰·인터넷 가입,<br />
              <em>최대 혜택</em>으로 상담받으세요
            </h1>
            <ul className="hero-points">
              <li>KT · LG U+ · SK · 스카이라이프 비교</li>
              <li>가족 결합 할인까지 한 번에</li>
            </ul>
            <button className="btn btn-primary btn-lg hero-cta" onClick={scrollToForm}>무료 상담 신청</button>
          </div>
          <img className="hero-img" src="/logo.png" alt="" width="306" height="204" />
        </div>
      </section>

      <section id="apply" className="apply">
        <div className="site-inner apply-inner">
          <h2>상담 신청</h2>
          <p className="section-sub">남겨주시면 전문 상담사가 빠르게 연락드립니다.</p>
          <LeadForm />
        </div>
      </section>

      <section className="plans">
        <div className="site-inner">
          <h2>통신사별 요금 안내</h2>
          <p className="section-sub">가장 저렴한 요금은 주황색으로 표시돼요. 정확한 혜택은 상담 시 안내해 드립니다.</p>
          <PlanTables />
        </div>
      </section>

      <FloatingButtons />
      <EventPopup />
    </SiteLayout>
  );
}
