import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { fmtDateTime } from "../lib/format";
import NoteList from "../components/panel/NoteList";
import CallButton from "./CallButton";
import StatusButtons from "./StatusButtons";

/** 직원 DB 상세: 전화걸기 · 상태 변경 · 메모 이력 */
export default function StaffLeadSheet({ id, statuses, onClose, onUpdated }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api(`/staff/leads/${id}`).then(setD).catch((e) => setErr(e.message)), [id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const changeStatus = async (statusId) => {
    setBusy(true);
    setErr("");
    try {
      const { lead } = await api(`/staff/leads/${id}/status`, { method: "PATCH", body: { statusId } });
      onUpdated(lead);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  const addNote = async (content) => {
    await api(`/staff/leads/${id}/notes`, { method: "POST", body: { content } });
    onUpdated({ id, last_note: content });
    await load();
  };

  const l = d?.lead;
  return (
    <>
      <div className="drawer-dim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label="DB 상세">
        <div className="drawer-head">
          <h3>{l ? `${l.name} 님` : "DB 상세"}</h3>
          <button className="btn btn-sm" onClick={onClose}>닫기</button>
        </div>
        <div className="drawer-body">
          {err && <div className="alert alert-err">{err}</div>}
          {!l ? <p className="hint">불러오는 중…</p> : (
            <>
              <section>
                <div className="sheet-phone">
                  <span>{l.phone_masked}</span>
                  <CallButton leadId={l.id} className="btn btn-primary" />
                </div>
                <dl className="kv">
                  <dt>관심상품</dt><dd>{l.products.join(", ") || "-"}</dd>
                  <dt>희망통신사</dt><dd>{l.carrier || "-"}</dd>
                  <dt>통화가능</dt><dd>{l.call_time || "-"}</dd>
                  <dt>문의내용</dt><dd style={{ whiteSpace: "pre-wrap" }}>{l.message || "-"}</dd>
                  <dt>배정일시</dt><dd>{fmtDateTime(l.assigned_at)}</dd>
                  <dt>접수일시</dt><dd>{fmtDateTime(l.created_at)}</dd>
                </dl>
              </section>
              <section>
                <h4>상태</h4>
                <StatusButtons statuses={statuses} value={l.status_id} onChange={changeStatus} disabled={busy} />
              </section>
              <section>
                <h4>메모</h4>
                <NoteList notes={d.notes} onAdd={addNote} />
              </section>
              {d.history.length > 0 && (
                <section>
                  <h4>상태 변경 이력</h4>
                  <ul className="notes">
                    {d.history.map((h) => (
                      <li key={h.id}><span className="meta">{h.user_name} · {fmtDateTime(h.created_at)}</span>{h.from_name || "-"} → <b>{h.to_name}</b></li>
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
