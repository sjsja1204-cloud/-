import { useSearchParams } from "react-router-dom";
import SiteLayout from "../../components/site/SiteLayout";
import PageHero from "../../components/site/PageHero";
import ApplySection from "../../components/site/ApplySection";
import LiveTicker from "../../components/site/LiveTicker";
import { PRODUCTS, CARRIERS } from "../../lib/format";
import { supportTabs } from "./supportTabs";

/** 상담 신청 전용 페이지. ?product=인터넷&carrier=KT 로 미리 선택 가능 (광고 링크용) */
export default function ApplyPage() {
  const [sp] = useSearchParams();
  const product = sp.get("product");
  const carrier = sp.get("carrier");
  const initial = {
    ...(PRODUCTS.includes(product) ? { products: [product] } : {}),
    ...(CARRIERS.includes(carrier) ? { carrier } : {}),
  };
  return (
    <SiteLayout title="상담 신청">
      <PageHero title="상담 신청" desc="1분이면 충분해요. 남겨주시면 바로 연락드립니다." crumbs={[["고객센터"], ["상담 신청"]]} tabs={supportTabs} />
      <ApplySection title="무료 상담 신청" initial={initial} />
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="site-inner narrow"><LiveTicker rows={4} /></div>
      </section>
    </SiteLayout>
  );
}
