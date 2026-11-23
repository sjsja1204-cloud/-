/** 상태별 건수 요약 (누르면 해당 상태로 필터) */
export default function StaffSummary({ items, statuses, onPick }) {
  if (!items.length) return null;
  return (
    <div className="staff-summary">
      <div><b>{items.length}</b><span>전체</span></div>
      {statuses.filter((s) => !s.is_hidden).map((s) => (
        <button key={s.id} onClick={() => onPick(s.id)}>
          <b>{items.filter((l) => l.status_id === s.id).length}</b>
          <span>{s.name}</span>
        </button>
      ))}
    </div>
  );
}
