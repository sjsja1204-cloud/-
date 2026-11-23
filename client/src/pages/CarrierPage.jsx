import { useParams } from "react-router-dom";
import SiteLayout from "../components/site/SiteLayout";
import PageHero from "../components/site/PageHero";
import QuoteWidget from "../components/site/QuoteWidget";
import Icon from "../components/site/Icon";
import { PriceTable, DiscountTable } from "../components/plans/PlanTables";
import { formatWon } from "../lib/format";
import "../components/plans/plan-tables.css";
import { useSiteData, minPrice, hasPlanData } from "../lib/siteData";
import { useInternetTabs } from "./InternetPage";
import NotFound from "./NotFound";

/**
 * 통신사 페이지 — 관리자 > 요금표의 해당 통신사 데이터로 자동 구성.
 * 소개·대표 혜택 → 인터넷+TV 요금표 → 결합할인표·혜택 박스 → 간편 견적(이 통신사 선택) → 상담 신청.
 * 요금 데이터가 없으면 '요금 정보 준비중' + 상담 신청만.
 */
export default function CarrierPage() {
  const { carrierId } = useParams();
  const { carriers, status, openConsult } = useSiteData();
  const internetTabs = useInternetTabs();
  const c = carriers.find((x) => x.id === carrierId);
  if (status === "loading") return <SiteLayout><div className="center-msg">불러오는 중…</div></SiteLayout>;
  if (!c) return <NotFound />; // 없는 통신사 또는 숨김 처리된 통신사

  const ready = hasPlanData(c);
  const min = ready ? minPrice(c) : null;
  const highlights = (c.highlights || []).filter((h) => h && h.trim());
  const consult = () => openConsult("consult");

  return (
    <SiteLayout title={`${c.name} 인터넷·TV`}>
      <PageHero title={`${c.name} 인터넷 · TV`} desc={c.tagline} crumbs={[["인터넷·TV", "/internet"], [c.name]]} tabs={internetTabs} />

      <section className="sec">
        <div className="site-inner">
          <div className="cp-intro">
            <div className="cp-intro-main">
              <span className="cp-name">
                {c.logo ? <img src={c.logo} alt="" /> : null}
                {c.name}
              </span>
              {c.intro && <p className="cp-text">{c.intro}</p>}
              {highlights.length > 0 && (
                <ul className="cp-highlights">
                  {highlights.map((h, i) => <li key={i}><Icon name="check" size={18} stroke={2.4} />{h}</li>)}
                </ul>
              )}
            </div>
            <div className="cp-intro-side">
              {min != null && <p className="cp-min"><small>인터넷 + TV 월</small><b>{formatWon(min)}</b><small>부터</small></p>}
              <button type="button" className="btn btn-primary btn-lg" onClick={consult}>{c.name} 상담 신청 <Icon name="chevronRight" size={18} /></button>
            </div>
          </div>

          {ready ? (
            <>
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
            </>
          ) : (
            <div className="soon-box" role="status">
              <span className="soon-ic"><Icon name="clipboard" size={30} /></span>
              <p className="soon-title">요금 정보 준비중입니다.</p>
              <p className="soon-desc">상담 신청 시 안내해 드립니다.</p>
              <button type="button" className="btn btn-primary btn-lg" onClick={consult}>상담 신청</button>
            </div>
          )}
        </div>
      </section>

      {ready && (
        <>
          <QuoteWidget initialCarrier={c.id} inline />
          <section className="sec cp-cta-sec">
            <div className="site-inner cp-cta">
              <div>
                <b>{c.name} 가입, 조건에 맞춰 안내해 드려요</b>
                <p>결합할인·약정 조건을 확인하고 상담사가 연락드립니다.</p>
              </div>
              <button type="button" className="btn btn-primary btn-lg" onClick={consult}>상담 신청</button>
            </div>
          </section>
        </>
      )}
    </SiteLayout>
  );
}
