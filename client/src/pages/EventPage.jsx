import { useState } from "react";
import { Link } from "react-router-dom";
import SiteLayout from "../components/site/SiteLayout";
import PageHero from "../components/site/PageHero";
import Pager from "../components/site/Pager";
import Icon from "../components/site/Icon";
import { usePosts, fmtDay } from "../lib/posts";
import { kstDateStr } from "../lib/format";

export default function EventPage() {
  const [page, setPage] = useState(1);
  const { items, total, loading } = usePosts("event", { page, pageSize: 9 });
  const today = kstDateStr();
  return (
    <SiteLayout title="이벤트">
      <PageHero title="이벤트" desc="담아가넷에서 진행 중인 혜택을 확인하세요." crumbs={[["이벤트"]]} />
      <section className="sec">
        <div className="site-inner">
          {items.length ? (
            <div className="ev-grid">
              {items.map((e) => {
                const ended = e.ends_on && e.ends_on.slice(0, 10) < today;
                return (
                  <Link key={e.id} to={`/event/${e.id}`} className={`ev ${ended ? "ended" : ""}`}>
                    <div className="ev-img">
                      {e.image_url ? <img src={e.image_url} alt="" /> : <Icon name="gift" size={44} />}
                      <span className={`badge ${ended ? "" : "badge-accent"}`}>{ended ? "종료" : "진행중"}</span>
                    </div>
                    <div className="ev-body">
                      <b>{e.title}</b>
                      <span className="hint">{e.starts_on || e.ends_on ? `${fmtDay(e.starts_on) || ""} ~ ${fmtDay(e.ends_on) || ""}` : fmtDay(e.created_at)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="empty-box">{loading ? "불러오는 중…" : "진행 중인 이벤트를 준비하고 있습니다."}</div>
          )}
          <Pager page={page} total={total} pageSize={9} onChange={setPage} />
        </div>
      </section>
    </SiteLayout>
  );
}
