import { useParams } from "react-router-dom";
import SiteLayout from "../components/site/SiteLayout";
import PageHero from "../components/site/PageHero";
import ApplySection from "../components/site/ApplySection";
import Icon from "../components/site/Icon";
import { PriceTable, DiscountTable } from "../components/plans/PlanTables";
import { formatWon } from "../lib/format";
import "../components/plans/plan-tables.css";
import { useSiteData, minPrice } from "../lib/siteData";
import { useInternetTabs } from "./InternetPage";
import NotFound from "./NotFound";

/** 통신사별 상세: 요금표 + 결합할인 + 설치 안내 + 상담 폼 */
export default function CarrierPage() {
  const { carrierId } = useParams();
  const { carriers, status, formOptions } = useSiteData();
  const internetTabs = useInternetTabs();
  const c = carriers.find((x) => x.id === carrierId);
  if (status === "loading") return <SiteLayout><div className="center-msg">불러오는 중…</div></SiteLayout>;
  if (!c) return <NotFound />;
  const page = c;
  const min = minPrice(c);
  const formCarrier = formOptions.carriers.includes(c.formCarrier) ? c.formCarrier : undefined;

  return (
    <SiteLayout title={`${page.name} 인터넷·TV`}>
      <PageHero title={`${page.name} 인터넷 · TV`} desc={page.tagline} crumbs={[["인터넷·TV", "/internet"], [page.name]]} tabs={internetTabs} />

      <section className="sec">
        <div className="site-inner">
          <div className="brand-band" style={{ "--brand": page.color }}>
            <div>
              <span className="brand-name">{page.name}</span>
              {min != null && <p>인터넷 + TV 월 <b>{formatWon(min)}</b>부터</p>}
            </div>
            <a href="#apply" className="btn btn-lg brand-cta">{page.name} 상담 신청 <Icon name="chevronRight" size={18} /></a>
          </div>

          <div className="pt-wrap pt-standalone">
            <PriceTable table={c.priceTable} />
            {c.discountTables.map((t, i) => <DiscountTable key={i} table={t} />)}
          </div>

          <div className="info-grid">
            <div className="info-box">
              <h3><Icon name="wrench" size={20} /> 설치 안내</h3>
              <ul>
                <li>신청 후 보통 1~3일 이내 방문 설치 (지역·일정에 따라 다름)</li>
                <li>설치비는 통신사·상품에 따라 다르며 상담 시 안내</li>
                <li>와이파이 공유기 포함 요금 기준</li>
              </ul>
            </div>
            <div className="info-box">
              <h3><Icon name="question" size={20} /> 상담 전 확인하면 좋아요</h3>
              <ul>
                <li>현재 사용 중인 인터넷 약정 만료일</li>
                <li>가족 휴대폰 통신사와 요금제 (결합할인 계산용)</li>
                <li>TV 설치 대수</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <ApplySection title={`${page.name} 가입 상담`} initial={{ ...(formCarrier ? { carrier: formCarrier } : {}), products: formOptions.products.includes("인터넷+TV") ? ["인터넷+TV"] : [] }} />
    </SiteLayout>
  );
}
