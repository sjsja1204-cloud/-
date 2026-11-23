import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { SOURCE_LABEL } from "../lib/format";

export default function StatsPage() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const load = () => api("/admin/stats").then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  if (err) return <div className="alert alert-err">{err}</div>;
  if (!d) return <p className="hint">불러오는 중…</p>;
  const s = d.summary;

  return (
    <div>
      <div className="toolbar">
        <h2 className="page-title" style={{ margin: 0 }}>통계</h2>
        <span className="hint">한국시간 기준 · 주간은 월요일부터</span>
        <span className="spacer" />
        <button className="btn btn-sm" onClick={load}>새로고침</button>
      </div>

      <div className="stat-grid">
        <div className="stat"><b>{s.today}</b><span>오늘 접수</span></div>
        <div className="stat"><b>{s.week}</b><span>이번 주 접수</span></div>
        <div className="stat"><b>{s.unassigned}</b><span>미배정</span></div>
        <div className="stat"><b>{s.total}</b><span>전체 DB</span></div>
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", marginBottom: 12 }}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>상태</th><th className="num">건수</th></tr></thead>
            <tbody>{d.byStatus.map((r) => <tr key={r.id}><td>{r.name}</td><td className="num">{r.n}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>출처</th><th className="num">오늘</th><th className="num">이번 주</th></tr></thead>
            <tbody>{d.bySource.map((r) => <tr key={r.source}><td>{SOURCE_LABEL[r.source]}</td><td className="num">{r.today}</td><td className="num">{r.week}</td></tr>)}</tbody>
          </table>
        </div>
      </div>

      <h3 style={{ fontSize: 15, margin: "8px 0" }}>직원별 오늘</h3>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr><th>직원</th><th className="num">일일 할당량</th><th className="num">오늘 배정</th><th className="num">오늘 처리</th><th className="num">오늘 개통완료</th><th className="num">진행중 보유</th></tr>
          </thead>
          <tbody>
            {d.byStaff.map((r) => (
              <tr key={r.id} style={{ opacity: r.is_active ? 1 : 0.5 }}>
                <td><b>{r.name}</b>{!r.is_active && " (비활성)"}</td>
                <td className="num">{r.daily_quota}</td>
                <td className="num">{r.assigned_today}</td>
                <td className="num">{r.processed_today}</td>
                <td className="num" style={{ color: r.opened_today ? "var(--brand)" : undefined, fontWeight: r.opened_today ? 700 : 400 }}>{r.opened_today}</td>
                <td className="num">{r.open_total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!d.byStaff.length && <div className="tbl-empty">직원이 없습니다.</div>}
      </div>
      <p className="hint">처리 = 오늘 해당 직원이 상태를 변경한 DB 수 · 진행중 보유 = 최종 상태(개통완료/거절)가 아닌 배정 DB 수</p>
    </div>
  );
}
