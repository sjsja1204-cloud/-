import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SiteLayout from "../../components/site/SiteLayout";
import PageHero from "../../components/site/PageHero";
import { api } from "../../lib/api";
import { fmtDay, BOARD_LABEL } from "../../lib/posts";
import { supportTabs } from "./supportTabs";

/** 공지사항·이벤트 상세 (본문은 텍스트로만 표시) */
export default function PostDetail({ board }) {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    api(`/public/posts/${id}`).then((d) => setPost(d.post)).catch((e) => setErr(e.message));
  }, [id]);

  const isEvent = board === "event";
  const listTo = isEvent ? "/event" : "/support/notice";
  const label = BOARD_LABEL[board];
  const ok = post && post.board === board;

  return (
    <SiteLayout title={ok ? post.title : label}>
      <PageHero title={label} crumbs={isEvent ? [["이벤트", "/event"]] : [["고객센터"], [label, listTo]]} tabs={isEvent ? undefined : supportTabs} />
      <section className="sec">
        <div className="site-inner narrow">
          {err || (post && !ok) ? (
            <div className="empty-box">게시글을 찾을 수 없습니다.</div>
          ) : !post ? (
            <div className="empty-box">불러오는 중…</div>
          ) : (
            <article className="post">
              <header className="post-head">
                <h2>{post.title}</h2>
                <p className="hint">
                  {fmtDay(post.created_at)}
                  {isEvent && (post.starts_on || post.ends_on) && ` · 기간 ${fmtDay(post.starts_on) || "~"} ~ ${fmtDay(post.ends_on) || ""}`}
                </p>
              </header>
              {post.image_url && <img className="post-img" src={post.image_url} alt="" />}
              <div className="post-body">{post.content}</div>
              {post.link_url && (
                post.link_url.startsWith("/")
                  ? <Link to={post.link_url} className="btn btn-primary btn-lg">자세히 보기</Link>
                  : <a href={post.link_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg">자세히 보기</a>
              )}
            </article>
          )}
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <Link to={listTo} className="btn">목록으로</Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
