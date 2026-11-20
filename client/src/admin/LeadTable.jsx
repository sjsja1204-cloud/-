import { fmtDateTime, SOURCE_LABEL, hyphenPhone } from "../lib/format";
import { StatusBadge } from "../components/panel/hooks";

export default function LeadTable({ items, loading, selected, setSelected, onOpen }) {
  const allChecked = items.length > 0 && items.every((l) => selected.has(l.id));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allChecked) items.forEach((l) => next.delete(l.id));
    else items.forEach((l) => next.add(l.id));
    setSelected(next);
  };
  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th><input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="전체 선택" /></th>
            <th>접수일시</th>
            <th>이름</th>
            <th>연락처</th>
            <th>관심상품</th>
            <th>통신사</th>
            <th>상태</th>
            <th>담당자</th>
            <th>출처</th>
            <th>유입</th>
            <th>최근 메모</th>
          </tr>
        </thead>
        <tbody>
          {items.map((l) => (
            <tr key={l.id} className={`clickable ${selected.has(l.id) ? "selected" : ""}`} onClick={() => onOpen(l.id)}>
              <td onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} aria-label={`${l.name} 선택`} />
              </td>
              <td className="nowrap muted">{fmtDateTime(l.created_at)}</td>
              <td className="nowrap"><b>{l.name}</b></td>
              <td className="nowrap">
                {hyphenPhone(l.phone)} {l.is_duplicate && <span className="badge badge-dup">중복</span>}
              </td>
              <td className="nowrap">{(l.products || []).join(", ")}</td>
              <td className="nowrap">{l.carrier || "-"}</td>
              <td><StatusBadge name={l.status_name} isFinal={l.is_final} /></td>
              <td className="nowrap">{l.assignee_name || <span className="muted">미배정</span>}</td>
              <td className="nowrap muted">{SOURCE_LABEL[l.source]}</td>
              <td className="nowrap muted">{l.utm_source || "-"}</td>
              <td className="ellipsis muted">{l.last_note || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!items.length && <div className="tbl-empty">{loading ? "불러오는 중…" : "조건에 맞는 DB가 없습니다."}</div>}
    </div>
  );
}
