import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import SiteLayout from "../../components/site/SiteLayout";
import PageHero from "../../components/site/PageHero";
import Icon from "../../components/site/Icon";
import { usePosts } from "../../lib/posts";
import { supportTabs } from "./supportTabs";

export default function FaqPage() {
  const { items, loading } = usePosts("faq", { pageSize: 50 });
  const { hash } = useLocation();
  const [open, setOpen] = useState(null);
  useEffect(() => {
    const m = hash.match(/^#q(\d+)$/);
    if (m && items.length) {
      setOpen(Number(m[1]));
      setTimeout(() => document.getElementById(`q${m[1]}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    }
  }, [hash, items.length]);

  return (
    <SiteLayout title="자주 묻는 질문">
      <PageHero title="자주 묻는 질문" crumbs={[["고객센터"], ["자주 묻는 질문"]]} tabs={supportTabs} />
      <section className="sec">
        <div className="site-inner narrow">
          <div className="faq">
            {items.map((f) => (
              <div key={f.id} id={`q${f.id}`} className={`faq-item ${open === f.id ? "open" : ""}`}>
                <button aria-expanded={open === f.id} onClick={() => setOpen(open === f.id ? null : f.id)}>
                  <b>Q</b><span>{f.title}</span><Icon name="chevronDown" size={18} />
                </button>
                {open === f.id && <div className="faq-a"><b>A</b><p>{f.content}</p></div>}
              </div>
            ))}
          </div>
          {!items.length && <div className="empty-box">{loading ? "불러오는 중…" : "등록된 질문이 없습니다."}</div>}
        </div>
      </section>
    </SiteLayout>
  );
}
