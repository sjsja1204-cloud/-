import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useSiteData } from "../lib/siteData";
import { fmtDate } from "../lib/reviews";
import { ImageUpload } from "./content/bits";
import "./content/editor.css";

/** 화면 표시용 이름 가림 (서버 maskName 과 같은 규칙): 홍길동 → 홍*동 */
export const maskName = (name) => {
  const s = [...String(name || "").trim()];
  if (!s.length) return "고객";
  if (s.includes("*") || s.length === 1) return s.join("");
  if (s.length === 2) return s[0] + "*";
  return s[0] + "*".repeat(s.length - 2) + s[s.length - 1];
};
const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
const empty = () => ({ customerName: "", carrier: "", product: "", rating: 5, content: "", reviewDate: today(), imageUrl: "", isPublished: true });
const fromRow = (r) => ({
  customerName: r.customer_name, carrier: r.carrier, product: r.product, rating: r.rating, content: r.content,
  reviewDate: r.review_day, imageUrl: r.image_url || "", isPublished: r.is_published,
});

/** 관리자: 후기 — 실제 고객 후기 추가·수정·삭제·숨기기·순서 변경 (목록 순서 = 홈페이지 표시 순서) */
export default function ReviewsAdminPage() {
  const { carriers } = useSiteData();
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [edit, setEdit] = useState(null); // { id?, form }
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api("/admin/reviews").then((d) => { setItems(d.items); setProducts(d.products); })
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
    const body = { ...edit.form, rating: Number(edit.form.rating) };
    const ok = await run(() => (edit.id ? api(`/admin/reviews/${edit.id}`, { method: "PUT", body }) : api("/admin/reviews", { method: "POST", body })), "저장했습니다.");
    if (ok) setEdit(null);
  };
  const remove = (r) => {
    if (!confirm(`${maskName(r.customer_name)} 님 후기를 삭제할까요? 되돌릴 수 없습니다.`)) return;
    run(() => api(`/admin/reviews/${r.id}`, { method: "DELETE" }), "삭제했습니다.");
  };
  const toggle = (r) => run(() => api(`/admin/reviews/${r.id}`, { method: "PUT", body: { ...fromRow(r), isPublished: !r.is_published } }));
  const move = (i, d) => {
    const ids = items.map((r) => r.id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    run(() => api("/admin/reviews/order", { method: "PUT", body: { ids } }));
  };
  const sortByDate = () => {
    if (!confirm("작성일이 최근인 후기가 위로 오도록 순서를 다시 정렬할까요?")) return;
    run(() => api("/admin/reviews/sort-by-date", { method: "POST" }), "작성일순으로 정렬했습니다.");
  };

  const set = (k, v) => setEdit((x) => ({ ...x, form: { ...x.form, [k]: v } }));
  const f = edit?.form;

  return (
    <div>
      <h2 className="page-title">후기</h2>
      <div className="alert alert-err" role="note"><b>실제 고객이 작성한 후기만 등록하세요. 거짓 후기 게시는 법적 제재 대상입니다.</b></div>
      <p className="hint" style={{ margin: "0 0 10px" }}>
        고객 이름은 홈페이지에 <b>홍*동</b>처럼 가려서 표시됩니다. 목록 순서가 홈페이지 표시 순서이고, 새 후기는 맨 위에 추가돼요. 메인 화면에는 위에서 6개가 나옵니다.
      </p>
      <div className="toolbar">
        <button className="btn btn-sm btn-primary" onClick={() => { setEdit({ form: empty() }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>+ 후기 등록</button>
        <span className="spacer" />
        <button className="btn btn-sm" disabled={busy || items.length < 2} onClick={sortByDate}>작성일순으로 정렬</button>
      </div>
      {msg && <div className={`alert ${msg.err ? "alert-err" : "alert-ok"}`} onClick={() => setMsg(null)}>{msg.text}</div>}

      {edit && (
        <form className="card" style={{ marginBottom: 12, display: "grid", gap: 12 }} onSubmit={save}>
          <b>{edit.id ? "후기 수정" : "새 후기 등록"}</b>
          <div className="filters" style={{ margin: 0 }}>
            <label>고객 이름 <span className="hint">(표시: {maskName(f.customerName)})</span>
              <input className="input" value={f.customerName} maxLength={30} required onChange={(e) => set("customerName", e.target.value)} placeholder="예: 홍길동" />
            </label>
            <label>통신사
              <input className="input" list="rv-carriers" value={f.carrier} maxLength={50} onChange={(e) => set("carrier", e.target.value)} placeholder="선택 또는 입력" />
              <datalist id="rv-carriers">{carriers.map((c) => <option key={c.id} value={c.name} />)}</datalist>
            </label>
            <label>가입 상품
              <select className="select" value={f.product} onChange={(e) => set("product", e.target.value)}>
                <option value="">선택 안 함</option>
                {products.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label>별점
              <select className="select" value={f.rating} onChange={(e) => set("rating", e.target.value)}>
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}{"☆".repeat(5 - n)} ({n}점)</option>)}
              </select>
            </label>
            <label>작성일 <input type="date" className="input" value={f.reviewDate} max={today()} required onChange={(e) => set("reviewDate", e.target.value)} /></label>
          </div>
          <label className="field" style={{ margin: 0 }}>
            <span className="field-label">후기 내용 <span className="hint">(고객이 쓴 내용 그대로 · 줄바꿈 그대로 표시)</span></span>
            <textarea className="textarea" rows={6} value={f.content} maxLength={3000} required onChange={(e) => set("content", e.target.value)} />
          </label>
          <div>
            <p className="field-label" style={{ margin: "0 0 6px" }}>사진 <span className="hint">(선택 · 고객 동의를 받은 사진만)</span></p>
            <ImageUpload value={f.imageUrl} kind="review" onChange={(v) => set("imageUrl", v)} />
          </div>
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
          <thead><tr><th>순서</th><th>고객</th><th>통신사·상품</th><th>별점</th><th>내용</th><th>작성일</th><th>공개</th><th>관리</th></tr></thead>
          <tbody>
            {items.map((r, i) => (
              <tr key={r.id} style={{ opacity: r.is_published ? 1 : 0.5 }}>
                <td className="nowrap">
                  <button className="btn btn-sm" aria-label="위로" disabled={busy || i === 0} onClick={() => move(i, -1)}>▲</button>{" "}
                  <button className="btn btn-sm" aria-label="아래로" disabled={busy || i === items.length - 1} onClick={() => move(i, 1)}>▼</button>
                </td>
                <td className="nowrap"><b>{maskName(r.customer_name)}</b><br /><span className="hint">{r.customer_name}</span></td>
                <td className="nowrap">{[r.carrier, r.product].filter(Boolean).join(" · ") || "-"}</td>
                <td className="nowrap">{"★".repeat(r.rating)}</td>
                <td className="ellipsis" style={{ maxWidth: 320 }}>{r.image_url ? "📷 " : ""}{r.content}</td>
                <td className="nowrap muted">{fmtDate(r.review_day)}</td>
                <td><button className="btn btn-sm" disabled={busy} onClick={() => toggle(r)}>{r.is_published ? "공개" : "숨김"}</button></td>
                <td className="nowrap" style={{ display: "flex", gap: 4 }}>
                  <button className="btn btn-sm" onClick={() => { setEdit({ id: r.id, form: fromRow(r) }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>수정</button>
                  <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => remove(r)}>삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <div className="tbl-empty">등록된 후기가 없습니다. 홈페이지에는 "후기를 준비 중입니다"가 표시됩니다.</div>}
      </div>
    </div>
  );
}
