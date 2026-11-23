import SiteLayout from "../components/site/SiteLayout";
import PageHero from "../components/site/PageHero";
import CarrierCards from "../components/site/CarrierCards";
import ApplySection from "../components/site/ApplySection";
import PlanTables from "../components/plans/PlanTables";
import { useSiteData } from "../lib/siteData";

/** 인터넷·TV 하위 탭: 전체 비교 + 공개된 통신사 */
export function useInternetTabs() {
  const { carriers } = useSiteData();
  return [{ label: "전체 비교", to: "/internet" }, ...carriers.map((c) => ({ label: c.name, to: `/internet/${c.id}` }))];
}

export default function InternetPage() {
  const internetTabs = useInternetTabs();
  return (
    <SiteLayout title="인터넷·TV 요금 비교">
      <PageHero title="인터넷 · TV" desc="통신사 4곳의 인터넷 + TV 요금과 결합할인을 한눈에 비교하세요."
        crumbs={[["인터넷·TV"]]} tabs={internetTabs} />
      <section className="sec">
        <div className="site-inner">
          <h2 className="sec-title">통신사별 최저 요금</h2>
          <CarrierCards />
        </div>
      </section>
      <section className="sec sec-soft">
        <div className="site-inner">
          <h2 className="sec-title">상세 요금표</h2>
          <p className="section-sub">가장 저렴한 요금은 강조 색으로 표시돼요. 정확한 금액은 상담 시 결합 조건에 맞춰 안내해 드립니다.</p>
          <div className="pt-card"><PlanTables /></div>
        </div>
      </section>
      <ApplySection initial={{ products: ["인터넷+TV"] }} />
    </SiteLayout>
  );
}
