import { useState } from "react";
import { fmtDateTime } from "../../lib/format";

/** 메모 이력 + 입력 (관리자·직원 공용). onAdd(content) 는 Promise 반환 */
export default function NoteList({ notes, onAdd }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setErr("");
    try {
      await onAdd(text.trim());
      setText("");
    } catch (er) {
      setErr(er.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <form className="note-form" onSubmit={submit}>
        <textarea className="textarea" rows={2} value={text} maxLength={2000} placeholder="메모 입력 (통화 내용, 다음 연락 시간 등)"
          onChange={(e) => setText(e.target.value)} />
        <button className="btn btn-dark" disabled={busy || !text.trim()}>등록</button>
      </form>
      {err && <p className="err">{err}</p>}
      {notes.length ? (
        <ul className="notes">
          {notes.map((n) => (
            <li key={n.id}>
              <span className="meta">{n.user_name || "-"} · {fmtDateTime(n.created_at)}</span>
              {n.content}
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint">메모가 없습니다.</p>
      )}
    </div>
  );
}
