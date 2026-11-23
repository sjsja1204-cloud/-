import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { SOURCE_LABEL } from "../lib/format";

export const emptyFilter = { q: "", from: "", to: "", status: "", assignee: "", source: "", utm: "", unassigned: false, duplicate: false };

export default function LeadFilters({ value, onChange, onSearch, statuses, staff }) {
  const [utms, setUtms] = useState([]);
  useEffect(() => {
    api("/admin/leads/filter-options").then((d) => setUtms(d.utmSources)).catch(() => {});
  }, []);
  const set = (k, v) => onChange({ ...value, [k]: v });
  const submit = (e) => {
    e.preventDefault();
    onSearch(value);
  };
  const reset = () => {
    onChange(emptyFilter);
    onSearch(emptyFilter);
  };

  return (
    <form className="card" style={{ marginBottom: 10 }} onSubmit={submit}>
      <div className="filters">
        <label>검색 (이름/연락처)
          <input className="input" value={value.q} onChange={(e) => set("q", e.target.value)} placeholder="홍길동 / 1234" />
        </label>
        <label>접수일 시작<input type="date" className="input" value={value.from} onChange={(e) => set("from", e.target.value)} /></label>
        <label>접수일 끝<input type="date" className="input" value={value.to} onChange={(e) => set("to", e.target.value)} /></label>
        <label>상태
          <select className="select" value={value.status} onChange={(e) => set("status", e.target.value)}>
            <option value="">전체</option>
            {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}{s.is_hidden ? " (숨김)" : ""}</option>)}
          </select>
        </label>
        <label>담당자
          <select className="select" value={value.assignee} onChange={(e) => set("assignee", e.target.value)}>
            <option value="">전체</option>
            <option value="none">미배정</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}{s.is_active ? "" : " (비활성)"}</option>)}
          </select>
        </label>
        <label>출처
          <select className="select" value={value.source} onChange={(e) => set("source", e.target.value)}>
            <option value="">전체</option>
            {Object.entries(SOURCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label>유입경로 (utm_source)
          <select className="select" value={value.utm} onChange={(e) => set("utm", e.target.value)}>
            <option value="">전체</option>
            <option value="(direct)">직접/없음</option>
            {utms.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </label>
        <span className="check"><input type="checkbox" id="f-un" checked={value.unassigned} onChange={(e) => set("unassigned", e.target.checked)} /><label htmlFor="f-un" style={{ color: "inherit", fontSize: 14 }}>미배정만</label></span>
        <span className="check"><input type="checkbox" id="f-dup" checked={value.duplicate} onChange={(e) => set("duplicate", e.target.checked)} /><label htmlFor="f-dup" style={{ color: "inherit", fontSize: 14 }}>중복만</label></span>
      </div>
      <div className="toolbar" style={{ margin: 0 }}>
        <button className="btn btn-sm btn-primary">검색</button>
        <button type="button" className="btn btn-sm" onClick={reset}>초기화</button>
      </div>
    </form>
  );
}
