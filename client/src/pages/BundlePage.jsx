import { useState } from "react";
import SiteLayout from "../components/site/SiteLayout";
import PageHero from "../components/site/PageHero";
import ApplySection from "../components/site/ApplySection";
import { DiscountTable } from "../components/plans/PlanTables";
import { carriers } from "../components/plans/telecomPlans";
import "../components/plans/plan-tables.css";
import { carrierPages } from "../config/site";

/** 결합할인: 통신사별 결합 할인표 (telecomPlans.js 의 discountTables) */
export default function BundlePage() {
  const withDiscount = carriers.filter((c) => c.discountTables.length);
  const [active, setActive] = useState(withDiscount[0]?.id);
  const c = withDiscount.find((x) => x.id === active);

  return (
    <SiteLayout title="결합할인">
      <PageHero title="결합할인" desc="휴대폰 + 인터넷을 같은 통신사로 묶으면 매달 할인받을 수 있어요." crumbs={[["결합할인"]]} />
      <section className="sec">
        <div className="site-inner">
          <div className="steps-mini">
            <div><b>1</b>가족 휴대폰 통신사 확인</div>
            <div><b>2</b>휴대폰 요금 합계 확인</div>
            <div><b>3</b>할인 큰 조합으로 결합</div>
          </div>
          <div className="pt-wrap pt-standalone">
            <div className="pt-tabs" role="tablist">
              {withDiscount.map((x) => (
                <button key={x.id} role="tab" aria-selected={x.id === active} className={x.id === active ? "pt-tab active" : "pt-tab"} onClick={() => setActive(x.id)}>
                  {carrierPages[x.id]?.name || x.name}
                </button>
              ))}
            </div>
            {c?.discountTables.map((t) => <DiscountTable key={t.title} table={t} />)}
          </div>
          <p className="hint">※ 결합 조건과 할인액은 통신사 정책에 따라 바뀔 수 있으며, 상담 시 고객님 가족 구성에 맞춰 정확히 계산해 드립니다.</p>
        </div>
      </section>
      <ApplySection title="결합할인 상담" desc="가족 휴대폰 통신사만 알려주시면 가장 유리한 조합을 찾아드려요." initial={{ products: ["결합상품"] }} />
    </SiteLayout>
  );
}
