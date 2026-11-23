import { useState } from "react";
import SiteLayout from "../../components/site/SiteLayout";
import PageHero from "../../components/site/PageHero";
import ReviewCard from "../../components/site/ReviewCard";
import Icon from "../../components/site/Icon";
import { useReviews } from "../../lib/reviews";
import { useSiteData } from "../../lib/siteData";

/** 후기 (/reviews) — 관리자가 등록한 실제 고객 후기. 통신사 필터, 최신순, 10개씩 더보기 */
export default function ReviewsPage() {
  const [carrier, setCarrier] = useState("");
  const r = useReviews({ carrier, pageSize: 10 });
  const { openConsult } = useSiteData();
  const empty = !r.loading && !r.items.length;

  return (
    <SiteLayout title="후기">
      <PageHero title="고객 후기" desc="담아가넷에서 가입하신 고객님들의 실제 후기입니다." crumbs={[["후기"]]} />
      <section className="sec">
        <div className="site-inner">
          {(r.carriers.length > 1 || carrier) && (
            <div className="chip-filter" role="group" aria-label="통신사별 보기">
              {["", ...r.carriers].map((c) => (
                <button key={c || "all"} type="button" className={`chip ${carrier === c ? "on" : ""}`} aria-pressed={carrier === c} onClick={() => setCarrier(c)}>
                  {c || "전체"}
                </button>
              ))}
            </div>
          )}

          {r.items.length > 0 && <div className="rv-grid">{r.items.map((v) => <ReviewCard key={v.id} review={v} clamp={false} />)}</div>}
          {r.loading && !r.items.length && <div className="empty-box">불러오는 중…</div>}
          {empty && (
            <div className="soon-box" role="status">
              <span className="soon-ic"><Icon name="star" size={30} /></span>
              <p className="soon-title">후기를 준비 중입니다.</p>
              <p className="soon-desc">상담 신청을 남겨 주시면 조건에 맞는 상품을 안내해 드립니다.</p>
              <button type="button" className="btn btn-primary btn-lg" onClick={() => openConsult("consult")}>상담 신청</button>
            </div>
          )}
          {r.hasMore && (
            <div className="more-wrap">
              <button type="button" className="btn btn-lg" onClick={r.more} disabled={r.loading}>
                {r.loading ? "불러오는 중…" : `후기 더보기 (${r.items.length}/${r.total})`}
              </button>
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
