import { kstDateStr } from "../lib/format";

/** 날짜(배정일) · 상태 필터 */
export default function StaffFilters({ value, onChange, statuses }) {
  const isCustom = value.date !== "today" && value.date !== "all";
  return (
    <div className="staff-filters">
      <div className="seg" role="group" aria-label="배정일">
        <button className={value.date === "today" ? "on" : ""} onClick={() => onChange({ ...value, date: "today" })}>오늘</button>
        <button className={value.date === "all" ? "on" : ""} onClick={() => onChange({ ...value, date: "all" })}>전체</button>
        <input type="date" className={isCustom ? "on" : ""} value={isCustom ? value.date : ""} max={kstDateStr()}
          onChange={(e) => onChange({ ...value, date: e.target.value || "today" })} aria-label="배정일 선택" />
      </div>
      <div className="chips-scroll" role="group" aria-label="상태">
        <button className={`chip ${!value.status ? "on" : ""}`} onClick={() => onChange({ ...value, status: "" })}>전체</button>
        {statuses.map((s) => (
          <button key={s.id} className={`chip ${String(value.status) === String(s.id) ? "on" : ""}`} onClick={() => onChange({ ...value, status: String(s.id) })}>
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}
