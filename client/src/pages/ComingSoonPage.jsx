import SiteLayout from "../components/site/SiteLayout";
import PageHero from "../components/site/PageHero";
import Icon from "../components/site/Icon";
import { useSiteData } from "../lib/siteData";

/** 꿀팁게시판·커뮤니티: 게시판은 2차 범위. 지금은 '준비중' 안내 + 상담 신청 */
export default function ComingSoonPage({ title, crumbs }) {
  const { openConsult } = useSiteData();
  return (
    <SiteLayout title={title}>
      <PageHero title={title} crumbs={crumbs || [[title]]} />
      <section className="sec">
        <div className="site-inner narrow">
          <div className="soon-box" role="status">
            <span className="soon-ic"><Icon name="bell" size={30} /></span>
            <p className="soon-title">{title} 페이지를 준비하고 있어요.</p>
            <p className="soon-desc">궁금한 점은 상담 신청을 남겨 주시면 바로 안내해 드립니다.</p>
            <button type="button" className="btn btn-primary btn-lg" onClick={() => openConsult("consult")}>상담 신청</button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
