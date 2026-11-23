import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { fmtDateTime } from "../lib/format";
import { BOARD_LABEL } from "../lib/posts";

// 후기·자주 묻는 질문은 전용 메뉴(관리자 > 후기, 자주 묻는 질문)로 옮김
const BOARDS = ["notice", "event"];
const empty = (board) => ({
  board, title: "", content: "", imageUrl: "", linkUrl: "", isPinned: false, isPublished: true,
  startsOn: "", endsOn: "", reviewName: "", reviewRating: 5, reviewTag: "", sortOrder: 0,
});
const fromRow = (p) => ({
  board: p.board, title: p.title, content: p.content, imageUrl: p.image_url || "", linkUrl: p.link_url || "",
  isPinned: p.is_pinned, isPublished: p.is_published, startsOn: p.starts_on || "", endsOn: p.ends_on || "",
  reviewName: p.review_name || "", reviewRating: p.review_rating || 5, reviewTag: p.review_tag || "", sortOrder: p.sort_order,
});

/** 관리자: 공지사항 / 이벤트 작성·수정 */
export default function PostsPage() {
  const [board, setBoard] = useState("notice");
  const [items, setItems] = useState([]);
  const [edit, setEdit] = useState(null); // { id?, form }
  const [msg, setMsg] = useState(null);

  const load = useCallback(() => api(`/admin/posts?board=${board}`).then((d) => setItems(d.items)).catch((e) => setMsg({ err: true, text: e.message })), [board]);
  useEffect(() => { load(); setEdit(null); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    const f = edit.form;
    const body = { ...f, reviewRating: board === "review" ? Number(f.reviewRating) : null, sortOrder: Number(f.sortOrder) || 0 };
    try {
      if (edit.id) await api(`/admin/posts/${edit.id}`, { method: "PUT", body });
      else await api("/admin/posts", { method: "POST", body });
      setMsg({ text: "저장했습니다." });
      setEdit(null);
      load();
    } catch (er) {
      setMsg({ err: true, text: er.message });
    }
  };
  const remove = async (p) => {
    if (!confirm(`"${p.title}" 글을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    try {
      await api(`/admin/posts/${p.id}`, { method: "DELETE" });
      setMsg({ text: "삭제했습니다." });
      load();
    } catch (er) {
      setMsg({ err: true, text: er.message });
    }
  };
  const togglePublish = async (p) => {
    try {
      await api(`/admin/posts/${p.id}`, { method: "PUT", body: { ...fromRow(p), isPublished: !p.is_published } });
      load();
    } catch (er) {
      setMsg({ err: true, text: er.message });
    }
  };

  const set = (k, v) => setEdit({ ...edit, form: { ...edit.form, [k]: v } });
  const f = edit?.form;

  return (
    <div>
      <h2 className="page-title">게시판 관리</h2>
      <div className="toolbar">
        {BOARDS.map((b) => (
          <button key={b} className={`btn btn-sm ${b === board ? "btn-dark" : ""}`} onClick={() => setBoard(b)}>{BOARD_LABEL[b]}</button>
        ))}
        <span className="spacer" />
        <button className="btn btn-sm btn-primary" onClick={() => setEdit({ form: empty(board) })}>+ 새 글</button>
      </div>
      {board === "review" && (
        <div className="alert alert-info">실제 상담 고객이 남긴 후기만 등록하세요. 후기를 지어내 올리면 거짓·기만 광고로 제재받을 수 있습니다.</div>
      )}
      {msg && <div className={`alert ${msg.err ? "alert-err" : "alert-ok"}`} onClick={() => setMsg(null)}>{msg.text}</div>}

      {edit && (
        <form className="card" style={{ marginBottom: 12, display: "grid", gap: 10 }} onSubmit={save}>
          <b>{edit.id ? "글 수정" : `새 ${BOARD_LABEL[board]}`}</b>
          <label className="field" style={{ margin: 0 }}>
            <span className="field-label">{board === "faq" ? "질문" : "제목"}</span>
            <input className="input" value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={200} required />
          </label>
          <label className="field" style={{ margin: 0 }}>
            <span className="field-label">{board === "faq" ? "답변" : "내용"} <span className="hint">(줄바꿈 그대로 표시됩니다)</span></span>
            <textarea className="textarea" rows={8} value={f.content} onChange={(e) => set("content", e.target.value)} />
          </label>
          {(board === "notice" || board === "event") && (
            <div className="filters" style={{ margin: 0 }}>
              <label>대표 이미지 주소 <input className="input" value={f.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="/images/event.jpg 또는 https://" /></label>
              <label>버튼 링크 <input className="input" value={f.linkUrl} onChange={(e) => set("linkUrl", e.target.value)} placeholder="/apply 또는 https://" /></label>
              {board === "event" && <label>시작일 <input type="date" className="input" value={f.startsOn} onChange={(e) => set("startsOn", e.target.value)} /></label>}
              {board === "event" && <label>종료일 <input type="date" className="input" value={f.endsOn} onChange={(e) => set("endsOn", e.target.value)} /></label>}
            </div>
          )}
          {board === "review" && (
            <div className="filters" style={{ margin: 0 }}>
              <label>표시 이름 <input className="input" value={f.reviewName} onChange={(e) => set("reviewName", e.target.value)} placeholder="김**" maxLength={20} /></label>
              <label>별점
                <select className="select" value={f.reviewRating} onChange={(e) => set("reviewRating", e.target.value)}>
                  {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}
                </select>
              </label>
              <label>상품 태그 <input className="input" value={f.reviewTag} onChange={(e) => set("reviewTag", e.target.value)} placeholder="KT 인터넷+TV" maxLength={50} /></label>
            </div>
          )}
          {board === "faq" && (
            <label className="field" style={{ margin: 0, maxWidth: 160 }}>
              <span className="field-label">정렬 순서 (작을수록 위)</span>
              <input type="number" className="input" value={f.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} />
            </label>
          )}
          <div className="toolbar" style={{ margin: 0 }}>
            {board !== "faq" && <label className="hint" style={{ display: "flex", gap: 6 }}><input type="checkbox" checked={f.isPinned} onChange={(e) => set("isPinned", e.target.checked)} /> 상단 고정</label>}
            <label className="hint" style={{ display: "flex", gap: 6 }}><input type="checkbox" checked={f.isPublished} onChange={(e) => set("isPublished", e.target.checked)} /> 홈페이지에 공개</label>
            <span className="spacer" />
            <button type="button" className="btn btn-sm" onClick={() => setEdit(null)}>취소</button>
            <button className="btn btn-sm btn-primary">저장</button>
          </div>
        </form>
      )}

      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr><th>{board === "faq" ? "순서" : "고정"}</th><th>제목</th>{board === "review" && <th>이름·별점</th>}{board === "event" && <th>기간</th>}<th>공개</th><th className="num">조회</th><th>작성</th><th>관리</th></tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} style={{ opacity: p.is_published ? 1 : 0.5 }}>
                <td>{board === "faq" ? p.sort_order : p.is_pinned ? <span className="badge badge-accent">고정</span> : ""}</td>
                <td className="ellipsis" style={{ maxWidth: 360 }}><b>{p.title}</b></td>
                {board === "review" && <td className="nowrap">{p.review_name || "-"} · {"★".repeat(p.review_rating || 0)}</td>}
                {board === "event" && <td className="nowrap muted">{p.starts_on || ""} ~ {p.ends_on || ""}</td>}
                <td><button className="btn btn-sm" onClick={() => togglePublish(p)}>{p.is_published ? "공개" : "비공개"}</button></td>
                <td className="num">{p.view_count}</td>
                <td className="nowrap muted">{p.author_name || "-"} · {fmtDateTime(p.created_at)}</td>
                <td className="nowrap" style={{ display: "flex", gap: 4 }}>
                  <button className="btn btn-sm" onClick={() => { setEdit({ id: p.id, form: fromRow(p) }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>수정</button>
                  <button className="btn btn-sm btn-danger" onClick={() => remove(p)}>삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <div className="tbl-empty">등록된 글이 없습니다.</div>}
      </div>
    </div>
  );
}
