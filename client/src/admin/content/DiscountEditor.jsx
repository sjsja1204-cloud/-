import { useState } from "react";
import { ItemTools, LinesInput, Field } from "./bits";
import { moveItem, removeAt, setAt } from "./useContentEditor";

const emptyTable = () => ({ title: "", desc: "", columns: ["구분", "할인"], rows: [["", ""]], notes: [], boxesTop: [], boxes: [] });
const emptyBox = () => ({ title: "", items: [["", ""]], note: "" });

/** 통신사의 결합할인표 여러 개 편집 */
export default function DiscountEditor({ tables, onChange }) {
  const [open, setOpen] = useState(0);
  const add = () => {
    onChange([...tables, emptyTable()]);
    setOpen(tables.length);
  };
  return (
    <div className="dtables">
      {!tables.length && <p className="hint">결합할인표가 없습니다. 이 통신사는 '결합할인' 메뉴에 나오지 않아요.</p>}
      {tables.map((t, i) => (
        <section key={i} className={`ecard ${open === i ? "open" : ""}`}>
          <header className="ecard-head" onClick={() => setOpen(open === i ? -1 : i)}>
            <b>{t.title || `${i + 1}번째 표 (제목 없음)`}</b>
            <span className="hint">{t.rows.length}줄 · 혜택 박스 {(t.boxesTop?.length || 0) + (t.boxes?.length || 0)}개</span>
            <span className="spacer" />
            <span onClick={(e) => e.stopPropagation()}>
              <ItemTools i={i} n={tables.length} onMove={(k, d) => onChange(moveItem(tables, k, d))}
                onRemove={(k) => onChange(removeAt(tables, k))} confirmText={`'${t.title || "제목 없는 표"}' 결합할인표를 삭제할까요?`} />
            </span>
            <span className="ecard-arrow">{open === i ? "▲" : "▼"}</span>
          </header>
          {open === i && <TableEditor table={t} onChange={(v) => onChange(setAt(tables, i, v))} />}
        </section>
      ))}
      <button type="button" className="btn btn-sm" onClick={add} disabled={tables.length >= 10}>+ 결합할인표 추가</button>
    </div>
  );
}

function TableEditor({ table: t, onChange }) {
  const set = (patch) => onChange({ ...t, ...patch });
  const cols = t.columns;

  const addCol = () => set({ columns: [...cols, ""], rows: t.rows.map((r) => [...r, ""]) });
  const delCol = (ci) =>
    confirm(`'${cols[ci] || ci + 1 + "번째"}' 열을 지울까요?\n\n삭제해도 '이전 버전'에서 되돌릴 수 있어요.`) &&
    set({ columns: removeAt(cols, ci), rows: t.rows.map((r) => removeAt(r, ci)) });
  const moveCol = (ci, d) => set({ columns: moveItem(cols, ci, d), rows: t.rows.map((r) => moveItem(r, ci, d)) });
  const setCell = (ri, ci, v) => set({ rows: setAt(t.rows, ri, setAt(t.rows[ri], ci, v)) });

  return (
    <div className="ecard-body">
      <div className="efields">
        <Field label="표 제목"><input className="input" value={t.title} maxLength={200} onChange={(e) => set({ title: e.target.value })} /></Field>
        <Field label="설명" hint="(선택)" wide><input className="input" value={t.desc} maxLength={1000} onChange={(e) => set({ desc: e.target.value })} /></Field>
      </div>

      <BoxList title="표 위에 보이는 혜택 박스" boxes={t.boxesTop || []} onChange={(v) => set({ boxesTop: v })}
        onMoveOther={(b, i) => set({ boxesTop: removeAt(t.boxesTop, i), boxes: [...(t.boxes || []), b] })} otherLabel="표 아래로 옮기기" />

      <p className="efield-label" style={{ marginTop: 14 }}>할인표 <span className="hint">(칸에 "5,500원", "-" 처럼 보이는 그대로 입력)</span></p>
      <div className="grid-wrap">
        <table className="egrid text">
          <thead>
            <tr>
              {cols.map((c, ci) => (
                <th key={ci}>
                  <input className={`cell head ${!c.trim() ? "bad" : ""}`} value={c} placeholder="열 이름" maxLength={100}
                    onChange={(e) => set({ columns: setAt(cols, ci, e.target.value) })} />
                  <span className="cell-tools">
                    <button type="button" disabled={ci === 0} onClick={() => moveCol(ci, -1)} aria-label="왼쪽으로">◀</button>
                    <button type="button" disabled={ci === cols.length - 1} onClick={() => moveCol(ci, 1)} aria-label="오른쪽으로">▶</button>
                    <button type="button" className="danger" onClick={() => delCol(ci)} aria-label="열 삭제">✕</button>
                  </span>
                </th>
              ))}
              <th className="addcol"><button type="button" className="btn btn-sm" onClick={addCol} disabled={cols.length >= 12}>+ 열</button></th>
            </tr>
          </thead>
          <tbody>
            {t.rows.map((r, ri) => (
              <tr key={ri}>
                {cols.map((_, ci) => (
                  <td key={ci}><input className="cell" value={r[ci] ?? ""} maxLength={100} onChange={(e) => setCell(ri, ci, e.target.value)} /></td>
                ))}
                <td className="rowtools">
                  <ItemTools i={ri} n={t.rows.length} onMove={(k, d) => set({ rows: moveItem(t.rows, k, d) })}
                    onRemove={(k) => set({ rows: removeAt(t.rows, k) })} confirmText={`${ri + 1}번째 줄을 지울까요?`} />
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={cols.length + 1}>
                <button type="button" className="btn btn-sm" onClick={() => set({ rows: [...t.rows, cols.map(() => "")] })} disabled={t.rows.length >= 60}>+ 줄 추가</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Field label="표 아래 안내 문구" hint="(한 줄에 하나씩, ※ 표시로 나옵니다)" wide>
        <LinesInput value={t.notes} onChange={(v) => set({ notes: v })} />
      </Field>

      <BoxList title="표 아래에 보이는 혜택 박스" boxes={t.boxes || []} onChange={(v) => set({ boxes: v })}
        onMoveOther={(b, i) => set({ boxes: removeAt(t.boxes, i), boxesTop: [...(t.boxesTop || []), b] })} otherLabel="표 위로 옮기기" />
    </div>
  );
}

function BoxList({ title, boxes, onChange, onMoveOther, otherLabel }) {
  return (
    <div className="boxlist">
      <p className="efield-label">{title}</p>
      {boxes.map((b, i) => (
        <BoxEditor key={i} box={b} onChange={(v) => onChange(setAt(boxes, i, v))}
          tools={<>
            <button type="button" className="btn btn-sm" onClick={() => onMoveOther(b, i)}>{otherLabel}</button>
            <ItemTools i={i} n={boxes.length} onMove={(k, d) => onChange(moveItem(boxes, k, d))}
              onRemove={(k) => onChange(removeAt(boxes, k))} confirmText={`'${b.title || "제목 없는"}' 혜택 박스를 삭제할까요?`} />
          </>} />
      ))}
      <button type="button" className="btn btn-sm" onClick={() => onChange([...boxes, emptyBox()])} disabled={boxes.length >= 10}>+ 혜택 박스</button>
    </div>
  );
}

function BoxEditor({ box: b, onChange, tools }) {
  const type = b.bullets ? "bullets" : "items";
  const set = (patch) => onChange({ ...b, ...patch });
  const switchType = (t) => {
    if (t === type) return;
    if (t === "bullets") onChange({ title: b.title, bullets: (b.items || []).map(([k, v]) => [k, v].filter(Boolean).join(" ")), note: b.note });
    else onChange({ title: b.title, items: (b.bullets || []).map((s) => [s, ""]), note: b.note });
  };
  return (
    <div className="ebox">
      <div className="ebox-head">
        <input className="input" value={b.title} placeholder="박스 제목" maxLength={200} onChange={(e) => set({ title: e.target.value })} />
        <select className="select" value={type} onChange={(e) => switchType(e.target.value)}>
          <option value="items">이름 + 값 목록</option>
          <option value="bullets">글머리 목록</option>
        </select>
        {tools}
      </div>
      {type === "items" ? (
        <div className="ebox-items">
          {(b.items || []).map(([k, v], i) => (
            <div key={i} className="ebox-item">
              <input className="input" value={k} placeholder="이름 (예: 베이직)" maxLength={100} onChange={(e) => set({ items: setAt(b.items, i, [e.target.value, v]) })} />
              <input className="input" value={v} placeholder="값 (예: 7,370원)" maxLength={100} onChange={(e) => set({ items: setAt(b.items, i, [k, e.target.value]) })} />
              <ItemTools i={i} n={b.items.length} onMove={(x, d) => set({ items: moveItem(b.items, x, d) })} onRemove={(x) => set({ items: removeAt(b.items, x) })} />
            </div>
          ))}
          <button type="button" className="btn btn-sm" onClick={() => set({ items: [...(b.items || []), ["", ""]] })}>+ 항목</button>
        </div>
      ) : (
        <LinesInput value={b.bullets} onChange={(v) => set({ bullets: v })} placeholder="한 줄에 하나씩" />
      )}
      <input className="input" value={b.note || ""} placeholder="박스 아래 메모 (선택)" maxLength={500} onChange={(e) => set({ note: e.target.value })} />
    </div>
  );
}
