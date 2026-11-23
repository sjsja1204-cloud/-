import Icon from "./Icon";
import { fmtDay } from "../../lib/posts";

export default function ReviewCard({ post, clamp = true }) {
  return (
    <article className="rv">
      <div className="rv-top">
        <span className="rv-stars" aria-label={`별점 ${post.review_rating || 5}점`}>
          {Array.from({ length: 5 }, (_, k) => (
            <Icon key={k} name="star" size={15} style={{ color: k < (post.review_rating || 5) ? "var(--accent)" : "#e5e7eb" }} />
          ))}
        </span>
        {post.review_tag && <span className="badge badge-accent">{post.review_tag}</span>}
      </div>
      <h3>{post.title}</h3>
      <p className={clamp ? "rv-body clamp" : "rv-body"}>{post.content}</p>
      <div className="rv-meta">{post.review_name || "고객"} 님 · {fmtDay(post.created_at)}</div>
    </article>
  );
}
