import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";

const empty = (category = "가입") => ({ category, question: "", answer: "", isPublished: true });
const fromRow = (f) => ({ category: f.category, question: f.question, answer: f.answer, isPublished: f.is_published });

/** 관리자: 자주 묻는 질문 — 고객센터(/support) 아코디언. 추가·수정·삭제·숨기기·순서 변경 */
export default function FaqAdminPage() {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [view, setView] = useState("");
  const [edit, setEdit] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api("/admin/faqs").then((d) => { setItems(d.items); setCats(d.categories); })
    .catch((e) => setMsg({ err: true, text: e.message })), []);
  useEffect(() => { load(); }, [load]);

  const run = async (fn, ok) => {
    setBusy(true);
    try {
      await fn();
      if (ok) setMsg({ text: ok });
      await load();
      return true;
    } catch (e) {
      setMsg({ err: true, text: e.message });
      return false;
    } finally {
      setBusy(false);
    }
  };
  const save = async (e) => {
    e.preventDefault();
    const ok = await run(() => (edit.id ? api(`/admin/faqs/${edit.id}`, { method: "PUT", body: edit.form }) : api("/admin/faqs", { method: "POST", body: edit.form })), "저장했습니다.");
    if (ok) setEdit(null);
  };
  const remove = (f) => confirm(`"${f.question}" 질문을 삭제할까요? 되돌릴 수 없습니다.`) && run(() => api(`/admin/faqs/${f.id}`, { method: "DELETE" }), "삭제했습니다.");
  const toggle = (f) => run(() => api(`/admin/faqs/${f.id}`, { method: "PUT", body: { ...fromRow(f), isPublished: !f.is_published } }));

  // 보이는 목록(분류 필터) 안에서 위·아래 질문과 자리 바꿈 → 전체 순서 저장
  const shown = view ? items.filter((f) => f.category === view) : items;
  const move = (i, d) => {
    const a = shown[i], b = shown[i + d];
    const ids = items.map((f) => f.id);
    const ia = ids.indexOf(a.id), ib = ids.indexOf(b.id);
    [ids[ia], ids[ib]] = [ids[ib], ids[ia]];
    run(() => api("/admin/faqs/order", { method: "PUT", body: { ids } }));
  };

  const set = (k, v) => setEdit((x) => ({ ...x, form: { ...x.form, [k]: v } }));
  const f = edit?.form;

  return (
    <div>
      <h2 className="page-title">자주 묻는 질문</h2>
      <p className="hint" style={{ margin: "0 0 10px" }}>고객센터 페이지에 분류별 탭과 펼침 목록으로 나옵니다. 저장하면 바로 반영되고, 목록 순서가 홈페이지 순서예요 (메인 화면에는 위에서 4개).</p>
      <div className="toolbar">
        {["", ...cats].map((c) => (
          <button key={c || "all"} className={`btn btn-sm ${view === c ? "btn-dark" : ""}`} onClick={() => setView(c)}>
            {c || "전체"} ({c ? items.filter((x) => x.category === c).length : items.length})
          </button>
        ))}
        <span className="spacer" />
        <button className="btn btn-sm btn-primary" onClick={() => { setEdit({ form: empty(view || "가입") }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>+ 질문 추가</button>
      </div>
      {msg && <div className={`alert ${msg.err ? "alert-err" : "alert-ok"}`} onClick={() => setMsg(null)}>{msg.text}</div>}

      {edit && (
        <form className="card" style={{ marginBottom: 12, display: "grid", gap: 10 }} onSubmit={save}>
          <b>{edit.id ? "질문 수정" : "새 질문"}</b>
          <label className="field" style={{ margin: 0, maxWidth: 200 }}>
            <span className="field-label">분류</span>
            <select className="select" value={f.category} onChange={(e) => set("category", e.target.value)}>
              {cats.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="field" style={{ margin: 0 }}>
            <span className="field-label">질문</span>
            <input className="input" value={f.question} maxLength={300} required onChange={(e) => set("question", e.target.value)} />
          </label>
          <label className="field" style={{ margin: 0 }}>
            <span className="field-label">답변 <span className="hint">(줄바꿈 그대로 표시)</span></span>
            <textarea className="textarea" rows={6} value={f.answer} maxLength={5000} required onChange={(e) => set("answer", e.target.value)} />
          </label>
          <div className="toolbar" style={{ margin: 0 }}>
            <label className="hint" style={{ display: "flex", gap: 6 }}><input type="checkbox" checked={f.isPublished} onChange={(e) => set("isPublished", e.target.checked)} /> 홈페이지에 공개</label>
            <span className="spacer" />
            <button type="button" className="btn btn-sm" onClick={() => setEdit(null)}>취소</button>
            <button className="btn btn-sm btn-primary" disabled={busy}>저장</button>
          </div>
        </form>
      )}

      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>순서</th><th>분류</th><th>질문</th><th>공개</th><th>관리</th></tr></thead>
          <tbody>
            {shown.map((x, i) => (
              <tr key={x.id} style={{ opacity: x.is_published ? 1 : 0.5 }}>
                <td className="nowrap">
                  <button className="btn btn-sm" aria-label="위로" disabled={busy || i === 0} onClick={() => move(i, -1)}>▲</button>{" "}
                  <button className="btn btn-sm" aria-label="아래로" disabled={busy || i === shown.length - 1} onClick={() => move(i, 1)}>▼</button>
                </td>
                <td className="nowrap"><span className="badge">{x.category}</span></td>
                <td className="ellipsis" style={{ maxWidth: 460 }}><b>{x.question}</b></td>
                <td><button className="btn btn-sm" disabled={busy} onClick={() => toggle(x)}>{x.is_published ? "공개" : "숨김"}</button></td>
                <td className="nowrap" style={{ display: "flex", gap: 4 }}>
                  <button className="btn btn-sm" onClick={() => { setEdit({ id: x.id, form: fromRow(x) }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>수정</button>
                  <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => remove(x)}>삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <div className="tbl-empty">{items.length ? "이 분류에는 질문이 없습니다." : "등록된 질문이 없습니다. '+ 질문 추가'로 입력하세요."}</div>}
      </div>
    </div>
  );
}
