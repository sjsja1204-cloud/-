import { fmtDateTime } from "../lib/format";
import { StatusBadge } from "../components/panel/hooks";
import CallButton from "./CallButton";

/** 직원 목록의 DB 1건 (연락처는 서버에서 마스킹된 값) */
export default function StaffLeadCard({ lead: l, onOpen }) {
  return (
    <article className={`lead-card ${l.is_final ? "done" : ""}`}>
      <div className="lead-card-main" onClick={onOpen} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onOpen()}>
        <div className="lead-card-top">
          <b className="lead-name">{l.name}</b>
          <StatusBadge name={l.status_name} isFinal={l.is_final} />
          {l.is_duplicate && <span className="badge badge-dup">중복</span>}
        </div>
        <div className="lead-phone">{l.phone_masked}</div>
        <div className="lead-meta">
          {(l.products || []).join(", ") || "-"} · {l.carrier || "-"}
          {l.call_time && <> · {l.call_time}</>}
        </div>
        <div className="lead-meta">배정 {fmtDateTime(l.assigned_at)}</div>
        {l.last_note && <div className="lead-note">💬 {l.last_note}</div>}
      </div>
      <div className="lead-card-actions">
        <CallButton leadId={l.id} />
        <button className="btn btn-sm" onClick={onOpen}>상태·메모</button>
      </div>
    </article>
  );
}
