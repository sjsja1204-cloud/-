import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { Field, ImageUpload, ItemTools } from "./content/bits";
import { moveItem } from "./content/useContentEditor";
import "./content/editor.css";

const empty = { imageUrl: "", alt: "", link: "#apply", title: "", body: "", buttonText: "", startAt: "", endAt: "", isActive: true };
const fromRow = (p) => ({
  imageUrl: p.image_url || "", alt: p.alt, link: p.link, title: p.title, body: p.body, buttonText: p.button_text,
  startAt: p.start_at || "", endAt: p.end_at || "", isActive: p.is_active,
});
const isLink = (v) => !v || (/^(\/|#|https?:\/\/)/.test(v) && !/\s/.test(v));

/** 관리자: 이벤트 팝업 — 켜기/끄기·기간은 저장 즉시 반영 */
export default function PopupsPage() {
  const [items, setItems] = useState(null);
  const [edit, setEdit] = useState(null); // { id?, form }
  const [msg, setMsg] = useState(null);

  const load = useCallback(() => api("/admin/popups").then((d) => setItems(d.items)).catch((e) => setMsg({ err: true, text: e.message })), []);
  useEffect(() => { load(); }, [load]);

  const run = async (fn, ok) => {
    try {
      await fn();
      if (ok) setMsg({ text: ok });
      await load();
      return true;
    } catch (e) {
      setMsg({ err: true, text: e.message });
      return false;
    }
  };
  const toggle = (p) => run(() => api(`/admin/popups/${p.id}/active`, { method: "PATCH", body: { isActive: !p.is_active } }), p.is_active ? "팝업을 껐습니다." : "팝업을 켰습니다.");
  const remove = (p) =>
    confirm(`'${p.title || p.alt || "이미지 팝업"}' 팝업을 삭제할까요?\n삭제하면 되돌릴 수 없어요. 잠시 내리려면 '끄기'를 쓰세요.`) &&
    run(() => api(`/admin/popups/${p.id}`, { method: "DELETE" }), "삭제했습니다.");
  const reorder = (i, d) => run(() => api("/admin/popups/order", { method: "POST", body: { ids: moveItem(items, i, d).map((p) => p.id) } }));

  const save = async (e) => {
    e.preventDefault();
    const ok = await run(
      () => (edit.id ? api(`/admin/popups/${edit.id}`, { method: "PUT", body: edit.form }) : api("/admin/popups", { method: "POST", body: edit.form })),
      "저장했습니다. 고객 화면에 바로 적용됩니다."
    );
    if (ok) setEdit(null);
  };
  const f = edit?.form;
  const set = (k, v) => setEdit({ ...edit, form: { ...edit.form, [k]: v } });
  const formErr = f && (!f.imageUrl && !f.title.trim() ? "이미지를 올리거나 제목을 입력하세요." : !isLink(f.link) ? "링크는 / 또는 # 또는 https:// 로 시작해야 합니다." : f.startAt && f.endAt && f.startAt > f.endAt ? "종료일이 시작일보다 빠릅니다." : "");

  return (
    <div className="editor-page">
      <h2 className="page-title">팝업 관리</h2>
      <p className="page-desc">홈페이지에 처음 들어올 때 뜨는 이벤트 팝업입니다. <b>켜기/끄기와 기간은 저장하는 즉시 반영</b>되고, 기간이 지나면 자동으로 안 뜹니다.</p>
      <div className="toolbar">
        <span className="hint">여러 개가 켜져 있으면 위에서부터 겹쳐서 보입니다.</span>
        <span className="spacer" />
        <button className="btn btn-sm btn-primary" onClick={() => setEdit({ form: { ...empty } })}>+ 새 팝업</button>
      </div>
      {msg && <div className={`alert ${msg.err ? "alert-err" : "alert-ok"}`} onClick={() => setMsg(null)}>{msg.text}</div>}

      {edit && (
        <form className="card ecard-body popup-form" onSubmit={save}>
          <b>{edit.id ? "팝업 수정" : "새 팝업"}</b>
          <Field label="팝업 이미지" hint="(세로로 긴 이미지 권장 · 자동으로 줄여 저장)" wide>
            <ImageUpload kind="popup" value={f.imageUrl} onChange={(url) => set("imageUrl", url)} />
          </Field>
          <div className="efields">
            <Field label="이미지 설명" hint="(시각장애인용 대체 글, 선택)"><input className="input" value={f.alt} maxLength={100} onChange={(e) => set("alt", e.target.value)} /></Field>
            <Field label="누르면 이동할 곳" hint="(#apply = 상담 폼, /event, https://…)">
              <input className="input" value={f.link} maxLength={500} onChange={(e) => set("link", e.target.value.trim())} />
            </Field>
            <Field label="시작일" hint="(비우면 바로)"><input type="date" className="input" value={f.startAt} onChange={(e) => set("startAt", e.target.value)} /></Field>
            <Field label="종료일" hint="(비우면 계속)"><input type="date" className="input" value={f.endAt} onChange={(e) => set("endAt", e.target.value)} /></Field>
          </div>
          {!f.imageUrl && (
            <div className="efields">
              <p className="hint wide">이미지가 없으면 아래 글자로 팝업을 만듭니다.</p>
              <Field label="제목"><input className="input" value={f.title} maxLength={100} onChange={(e) => set("title", e.target.value)} /></Field>
              <Field label="버튼 문구"><input className="input" value={f.buttonText} maxLength={30} onChange={(e) => set("buttonText", e.target.value)} placeholder="지금 상담 신청하기" /></Field>
              <Field label="내용" hint="(줄마다 한 줄씩 보여요)" wide><textarea className="textarea" rows={3} value={f.body} maxLength={500} onChange={(e) => set("body", e.target.value)} /></Field>
            </div>
          )}
          <label className="switch-row"><input type="checkbox" checked={f.isActive} onChange={(e) => set("isActive", e.target.checked)} /> <b>켜기</b> (기간 안이면 홈페이지에 보임)</label>
          {formErr && <span className="err">{formErr}</span>}
          <div className="toolbar" style={{ margin: 0 }}>
            <span className="spacer" />
            <button type="button" className="btn btn-sm" onClick={() => setEdit(null)}>취소</button>
            <button className="btn btn-sm btn-primary" disabled={!!formErr}>저장</button>
          </div>
        </form>
      )}

      {!items ? <p className="hint">불러오는 중…</p> : (
        <div className="popup-list">
          {items.map((p, i) => (
            <div key={p.id} className={`popup-card ${p.is_active ? "" : "off"}`}>
              <div className="popup-thumb">{p.image_url ? <img src={p.image_url} alt="" /> : <span>{p.title || "글자 팝업"}</span>}</div>
              <div className="popup-info">
                <b>{p.title || p.alt || "이미지 팝업"}</b>
                <span className="hint">{p.start_at || "바로"} ~ {p.end_at || "계속"} · 이동: {p.link || "없음"}</span>
                <span>{p.is_showing ? <span className="badge badge-accent">지금 보이는 중</span> : <span className="badge">{p.is_active ? "기간 아님" : "꺼짐"}</span>}</span>
              </div>
              <div className="popup-actions">
                <label className="toggle">
                  <input type="checkbox" checked={p.is_active} onChange={() => toggle(p)} />
                  <span>{p.is_active ? "켜짐" : "꺼짐"}</span>
                </label>
                <button className="btn btn-sm" onClick={() => { setEdit({ id: p.id, form: fromRow(p) }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>수정</button>
                <button className="btn btn-sm btn-danger" onClick={() => remove(p)}>삭제</button>
                <ItemTools i={i} n={items.length} onMove={reorder} />
              </div>
            </div>
          ))}
          {!items.length && <div className="tbl-empty">등록된 팝업이 없습니다.</div>}
        </div>
      )}
    </div>
  );
}
