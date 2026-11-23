import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { fmtDateTime, hyphenPhone, SOURCE_LABEL, quoteSummary, inquiryLabel, formatWon } from "../lib/format";
import NoteList from "../components/panel/NoteList";
import { StatusBadge, selectableStatuses } from "../components/panel/hooks";

/** 관리자 DB 상세/수정 패널 */
export default function LeadDetail({ id, statuses, staff, onClose, onChanged, onOpen }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    api(`/admin/leads/${id}`).then(setD).catch((e) => setErr(e.message));
  }, [id]);
  useEffect(() => {
    setD(null);
    load();
  }, [load]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const patch = async (body) => {
    setErr("");
    try {
      await api(`/admin/leads/${id}`, { method: "PATCH", body });
      load();
      onChanged();
    } catch (e) {
      setErr(e.message);
    }
  };
  const addNote = async (content) => {
    await api(`/admin/leads/${id}/notes`, { method: "POST", body: { content } });
    load();
    onChanged();
  };

  const l = d?.lead;
  return (
    <>
      <div className="drawer-dim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label="DB 상세">
        <div className="drawer-head">
          <h3>{l ? `${l.name} 님` : "DB 상세"} <span className="hint">#{id}</span></h3>
          <button className="btn btn-sm" onClick={onClose}>닫기</button>
        </div>
        <div className="drawer-body">
          {err && <div className="alert alert-err">{err}</div>}
          {!l ? <p className="hint">불러오는 중…</p> : (
            <>
              <section>
                <dl className="kv">
                  <dt>연락처</dt>
                  <dd><a href={`tel:${l.phone}`}>{hyphenPhone(l.phone)}</a> {l.is_duplicate && <span className="badge badge-dup">중복</span>}</dd>
                  {l.source === "web" && <><dt>접수 유형</dt><dd>{inquiryLabel(l)}</dd></>}
                  {l.quote_carrier && <><dt>견적 조건</dt><dd><b>{quoteSummary(l)}</b><br /><span className="hint">예상 월요금 {l.quote_estimated_price ? formatWon(l.quote_estimated_price) : "상담 시 안내"} (접수 당시)</span></dd></>}
                  <dt>관심상품</dt><dd>{l.products.join(", ") || "-"}</dd>
                  <dt>희망통신사</dt><dd>{l.carrier || "-"}</dd>
                  <dt>통화가능</dt><dd>{l.call_time || "-"}</dd>
                  <dt>문의내용</dt><dd style={{ whiteSpace: "pre-wrap" }}>{l.message || "-"}</dd>
                  <dt>접수일시</dt><dd>{fmtDateTime(l.created_at)}</dd>
                  <dt>출처</dt><dd>{SOURCE_LABEL[l.source]}{l.created_by_name ? ` (${l.created_by_name})` : ""}{l.upload_batch_id ? ` · 배치 #${l.upload_batch_id}` : ""}</dd>
                  <dt>유입경로</dt><dd>{[l.utm_source, l.utm_medium, l.utm_campaign].filter(Boolean).join(" / ") || "-"}</dd>
                  <dt>referrer</dt><dd className="hint">{l.referrer || "-"}</dd>
                  <dt>개인정보동의</dt><dd>{l.consent_at ? fmtDateTime(l.consent_at) : "-"}</dd>
                </dl>
              </section>

              <section className="card" style={{ display: "grid", gap: 10 }}>
                <label className="field" style={{ margin: 0 }}>
                  <span className="field-label">상태</span>
                  <select className="select" value={l.status_id} onChange={(e) => patch({ statusId: Number(e.target.value) })}>
                    {selectableStatuses(statuses, l.status_id).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
                <label className="field" style={{ margin: 0 }}>
                  <span className="field-label">담당자 {l.assigned_at && <span className="hint">· 배정 {fmtDateTime(l.assigned_at)}</span>}</span>
                  <select className="select" value={l.assignee_id ?? ""} onChange={(e) => patch({ assigneeId: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">미배정</option>
                    {l.assignee_id && !staff.some((s) => s.id === l.assignee_id) && <option value={l.assignee_id}>{l.assignee_name} (비활성)</option>}
                    {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
              </section>

              <section>
                <h4>메모 이력</h4>
                <NoteList notes={d.notes} onAdd={addNote} />
              </section>

              <section>
                <h4>상태 변경 이력</h4>
                {d.history.length ? (
                  <ul className="notes">
                    {d.history.map((h) => (
                      <li key={h.id}><span className="meta">{h.user_name || "-"} · {fmtDateTime(h.created_at)}</span>{h.from_name || "-"} → <b>{h.to_name}</b></li>
                    ))}
                  </ul>
                ) : <p className="hint">변경 이력이 없습니다.</p>}
              </section>

              {d.duplicates.length > 0 && (
                <section>
                  <h4>같은 연락처의 다른 DB</h4>
                  <ul className="notes">
                    {d.duplicates.map((x) => (
                      <li key={x.id} style={{ cursor: "pointer" }} onClick={() => onOpen(x.id)}>
                        <span className="meta">#{x.id} · {fmtDateTime(x.created_at)} · {SOURCE_LABEL[x.source]}</span>
                        {x.name} · <StatusBadge name={x.status_name} /> · {x.assignee_name || "미배정"}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
