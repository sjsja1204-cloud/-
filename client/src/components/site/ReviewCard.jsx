import Icon from "./Icon";
import { fmtDate } from "../../lib/reviews";

/** 후기 카드 — 이름은 서버에서 가린 값(김*희)만 받는다 */
export default function ReviewCard({ review: r, clamp = true }) {
  const tag = [r.carrier, r.product].filter(Boolean).join(" ");
  return (
    <article className="rv">
      <div className="rv-top">
        <span className="rv-stars" role="img" aria-label={`별점 5점 중 ${r.rating}점`}>
          {Array.from({ length: 5 }, (_, k) => (
            <Icon key={k} name="star" size={15} style={{ color: k < r.rating ? "var(--accent)" : "#e5e7eb" }} />
          ))}
        </span>
        {tag && <span className="badge badge-accent">{tag}</span>}
      </div>
      {r.imageUrl && <img className="rv-img" src={r.imageUrl} alt="" loading="lazy" />}
      <p className={clamp ? "rv-body clamp" : "rv-body"}>{r.content}</p>
      <div className="rv-meta">{r.name} 님 · {fmtDate(r.date)}</div>
    </article>
  );
}
