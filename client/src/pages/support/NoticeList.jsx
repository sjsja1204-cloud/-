import { useState } from "react";
import { Link } from "react-router-dom";
import SiteLayout from "../../components/site/SiteLayout";
import PageHero from "../../components/site/PageHero";
import Pager from "../../components/site/Pager";
import { usePosts, fmtDay } from "../../lib/posts";
import { supportTabs } from "./supportTabs";

export default function NoticeList() {
  const [page, setPage] = useState(1);
  const { items, total, loading } = usePosts("notice", { page, pageSize: 10 });
  return (
    <SiteLayout title="공지사항">
      <PageHero title="공지사항" crumbs={[["고객센터"], ["공지사항"]]} tabs={supportTabs} />
      <section className="sec">
        <div className="site-inner narrow">
          <ul className="notice-list">
            {items.map((n, k) => (
              <li key={n.id}>
                <span className="notice-no">{n.is_pinned ? <span className="badge badge-accent">공지</span> : total - (page - 1) * 10 - k}</span>
                <Link to={`/support/notice/${n.id}`}>{n.title}</Link>
                <span className="notice-date">{fmtDay(n.created_at)}</span>
              </li>
            ))}
          </ul>
          {!items.length && <div className="empty-box">{loading ? "불러오는 중…" : "등록된 공지가 없습니다."}</div>}
          <Pager page={page} total={total} pageSize={10} onChange={setPage} />
        </div>
      </section>
    </SiteLayout>
  );
}
