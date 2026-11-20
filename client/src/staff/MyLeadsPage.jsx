import { useCallback, useEffect, useState } from "react";
import { api, qs } from "../lib/api";
import { useStatuses } from "../components/panel/hooks";
import StaffFilters from "./StaffFilters";
import StaffSummary from "./StaffSummary";
import StaffLeadCard from "./StaffLeadCard";
import StaffLeadSheet from "./StaffLeadSheet";

/** 직원: 오늘 내 DB */
export default function MyLeadsPage() {
  const statuses = useStatuses();
  const [filter, setFilter] = useState({ date: "today", status: "" });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api(`/staff/leads${qs(filter)}`);
      setItems(d.items);
      setErr("");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  // 목록의 한 건만 갱신 (상태 변경/메모 후)
  const updateItem = (lead) => setItems((list) => list.map((l) => (l.id === lead.id ? { ...l, ...lead } : l)));

  return (
    <div className="staff-page">
      <StaffFilters value={filter} onChange={setFilter} statuses={statuses} />
      {!filter.status && <StaffSummary items={items} statuses={statuses} onPick={(id) => setFilter({ ...filter, status: String(id) })} />}
      {err && <div className="alert alert-err">{err}</div>}
      <div className="staff-list">
        {items.map((l) => <StaffLeadCard key={l.id} lead={l} onOpen={() => setOpenId(l.id)} />)}
      </div>
      {!items.length && <div className="tbl-empty">{loading ? "불러오는 중…" : "배정된 DB가 없습니다."}</div>}
      {openId && (
        <StaffLeadSheet id={openId} statuses={statuses} onClose={() => setOpenId(null)} onUpdated={updateItem} />
      )}
    </div>
  );
}
