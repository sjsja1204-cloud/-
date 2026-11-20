import { useState } from "react";
import SiteLayout from "../../components/site/SiteLayout";
import PageHero from "../../components/site/PageHero";
import ReviewCard from "../../components/site/ReviewCard";
import Pager from "../../components/site/Pager";
import { usePosts } from "../../lib/posts";
import { supportTabs } from "./supportTabs";

export default function ReviewsPage() {
  const [page, setPage] = useState(1);
  const { items, total, loading } = usePosts("review", { page, pageSize: 9 });
  return (
    <SiteLayout title="상담후기">
      <PageHero title="상담후기" desc="담아가넷에서 상담받으신 고객님들의 이야기입니다." crumbs={[["고객센터"], ["상담후기"]]} tabs={supportTabs} />
      <section className="sec">
        <div className="site-inner">
          {items.length ? (
            <div className="rv-grid">{items.map((p) => <ReviewCard key={p.id} post={p} clamp={false} />)}</div>
          ) : (
            <div className="empty-box">{loading ? "불러오는 중…" : "곧 고객님들의 후기가 올라옵니다."}</div>
          )}
          <Pager page={page} total={total} pageSize={9} onChange={setPage} />
        </div>
      </section>
    </SiteLayout>
  );
}
