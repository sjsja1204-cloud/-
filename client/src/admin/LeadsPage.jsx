import { useCallback, useEffect, useState } from "react";
import { api, download, qs } from "../lib/api";
import { useStatuses } from "../components/panel/hooks";
import LeadFilters, { emptyFilter } from "./LeadFilters";
import LeadTable from "./LeadTable";
import LeadDetail from "./LeadDetail";

const PAGE_SIZE = 50;

export default function LeadsPage() {
  const statuses = useStatuses();
  const [staff, setStaff] = useState([]);
  const [filter, setFilter] = useState(emptyFilter);
  const [applied, setApplied] = useState(emptyFilter);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [assignTo, setAssignTo] = useState("");
  const [detailId, setDetailId] = useState(null);
  const [msg, setMsg] = useState(null);

  const loadStaff = useCallback(() => api("/admin/users").then((d) => setStaff(d.users)).catch(() => {}), []);
  useEffect(() => { loadStaff(); }, [loadStaff]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api(`/admin/leads${qs({ ...applied, page, pageSize: PAGE_SIZE })}`);
      setData(d);
    } catch (e) {
      setMsg({ err: true, text: e.message });
    } finally {
      setLoading(false);
    }
  }, [applied, page]);
  useEffect(() => { load(); }, [load]);

  const search = (f) => {
    setApplied(f);
    setPage(1);
    setSelected(new Set());
  };

  const runDistribute = async () => {
    if (!confirm("미배정 DB를 직원별 오늘 남은 할당량만큼 오래된 순으로 분배합니다. 실행할까요?")) return;
    try {
      const r = await api("/admin/leads/distribute", { method: "POST" });
      const detail = r.perStaff.filter((p) => p.assigned).map((p) => `${p.name} ${p.assigned}건`).join(", ");
      setMsg({ text: r.assigned ? `${r.assigned}건 분배 완료 (${detail}) · 남은 미배정 ${r.unassignedLeft}건` : r.message || `분배할 수 있는 DB가 없습니다. (남은 미배정 ${r.unassignedLeft}건)` });
      load();
      loadStaff();
    } catch (e) {
      setMsg({ err: true, text: e.message });
    }
  };

  const bulkAssign = async () => {
    if (!selected.size) return setMsg({ err: true, text: "배정할 DB를 체크하세요." });
    if (!assignTo) return setMsg({ err: true, text: "담당자를 선택하세요." });
    const assigneeId = assignTo === "none" ? null : Number(assignTo);
    try {
      const r = await api("/admin/leads/assign", { method: "POST", body: { ids: [...selected], assigneeId } });
      setMsg({ text: assigneeId ? `${r.updated}건 배정했습니다.` : `${r.updated}건 배정 해제했습니다.` });
      setSelected(new Set());
      load();
    } catch (e) {
      setMsg({ err: true, text: e.message });
    }
  };

  const exportExcel = async () => {
    try {
      await download(`/admin/leads/export${qs(applied)}`, "leads.xlsx");
    } catch (e) {
      setMsg({ err: true, text: e.message });
    }
  };

  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const activeStaff = staff.filter((s) => s.is_active);

  return (
    <div>
      <h2 className="page-title">DB 목록 <span className="hint">총 {data.total.toLocaleString()}건</span></h2>
      <LeadFilters value={filter} onChange={setFilter} onSearch={search} statuses={statuses} staff={staff} />

      <div className="toolbar">
        <select className="select" style={{ width: 150, minHeight: 36 }} value={assignTo} onChange={(e) => setAssignTo(e.target.value)} aria-label="배정할 담당자">
          <option value="">담당자 선택</option>
          {activeStaff.map((s) => <option key={s.id} value={s.id}>{s.name}{s.role === "admin" ? " (관리자)" : ""}</option>)}
          <option value="none">— 배정 해제</option>
        </select>
        <button className="btn btn-sm btn-dark" onClick={bulkAssign}>선택 {selected.size}건 일괄 배정</button>
        <span className="spacer" />
        <button className="btn btn-sm btn-primary" onClick={runDistribute}>분배 실행</button>
        <button className="btn btn-sm" onClick={exportExcel}>엑셀 다운로드</button>
      </div>

      {msg && <div className={`alert ${msg.err ? "alert-err" : "alert-ok"}`} onClick={() => setMsg(null)}>{msg.text}</div>}

      <LeadTable items={data.items} loading={loading} selected={selected} setSelected={setSelected} onOpen={setDetailId} />

      <div className="pager">
        <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>이전</button>
        <span>{page} / {pages}</span>
        <button className="btn btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>다음</button>
      </div>

      {detailId && (
        <LeadDetail id={detailId} statuses={statuses} staff={activeStaff} onClose={() => setDetailId(null)} onChanged={load} onOpen={setDetailId} />
      )}
    </div>
  );
}
