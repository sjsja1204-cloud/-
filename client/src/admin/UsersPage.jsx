import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { fmtDate } from "../lib/format";
import { useAuth } from "../auth/AuthContext";

const empty = { loginId: "", name: "", password: "", role: "staff", dailyQuota: 20 };

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(empty);
  const [msg, setMsg] = useState(null);

  const load = () => api("/admin/users").then((d) => setUsers(d.users)).catch((e) => setMsg({ err: true, text: e.message }));
  useEffect(() => { load(); }, []);

  const run = async (fn, okText) => {
    setMsg(null);
    try {
      await fn();
      if (okText) setMsg({ text: okText });
      load();
    } catch (e) {
      setMsg({ err: true, text: e.message });
    }
  };

  const create = (e) => {
    e.preventDefault();
    run(async () => {
      await api("/admin/users", { method: "POST", body: { ...form, dailyQuota: Number(form.dailyQuota) || 0 } });
      setForm(empty);
    }, "계정을 만들었습니다.");
  };
  const patch = (u, body, okText) => run(() => api(`/admin/users/${u.id}`, { method: "PATCH", body }), okText);
  const resetPw = (u) => {
    const pw = prompt(`${u.name}(${u.login_id})의 새 비밀번호 (8자 이상)`);
    if (!pw) return;
    run(() => api(`/admin/users/${u.id}/reset-password`, { method: "POST", body: { password: pw } }), `${u.name} 비밀번호를 초기화했습니다.`);
  };

  return (
    <div>
      <h2 className="page-title">직원 관리</h2>

      <form className="card" style={{ marginBottom: 12 }} onSubmit={create}>
        <div className="filters">
          <label>아이디<input className="input" value={form.loginId} onChange={(e) => setForm({ ...form, loginId: e.target.value })} autoComplete="off" /></label>
          <label>이름<input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>초기 비밀번호<input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" placeholder="8자 이상" /></label>
          <label>역할
            <select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="staff">직원</option><option value="admin">관리자</option>
            </select>
          </label>
          <label>일일 할당량<input className="input" type="number" min={0} value={form.dailyQuota} onChange={(e) => setForm({ ...form, dailyQuota: e.target.value })} /></label>
        </div>
        <button className="btn btn-sm btn-primary">계정 생성</button>
      </form>

      {msg && <div className={`alert ${msg.err ? "alert-err" : "alert-ok"}`}>{msg.text}</div>}

      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr><th>아이디</th><th>이름</th><th>역할</th><th>일일 할당량</th><th className="num">오늘 배정</th><th>상태</th><th>생성일</th><th>관리</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                <td>{u.login_id}</td>
                <td><b>{u.name}</b></td>
                <td>
                  <select className="select" style={{ minHeight: 32, padding: "2px 6px", width: 90 }} value={u.role} disabled={u.id === me.id}
                    onChange={(e) => patch(u, { role: e.target.value }, "역할을 변경했습니다.")}>
                    <option value="staff">직원</option><option value="admin">관리자</option>
                  </select>
                </td>
                <td>
                  <QuotaInput value={u.daily_quota} onSave={(v) => patch(u, { dailyQuota: v }, `${u.name} 할당량 ${v}건으로 저장`)} />
                </td>
                <td className="num">{u.role === "staff" ? u.today_assigned : "-"}</td>
                <td className="nowrap">
                  {u.is_active ? "활성" : "비활성"} {u.is_locked && <span className="badge badge-dup">잠김</span>}
                </td>
                <td className="nowrap muted">{fmtDate(u.created_at)}</td>
                <td className="nowrap" style={{ display: "flex", gap: 4 }}>
                  <button className="btn btn-sm" onClick={() => resetPw(u)}>비밀번호 초기화</button>
                  {u.is_locked && <button className="btn btn-sm" onClick={() => patch(u, { unlock: true }, "잠금을 해제했습니다.")}>잠금 해제</button>}
                  {u.id !== me.id && (
                    <button className={`btn btn-sm ${u.is_active ? "btn-danger" : ""}`}
                      onClick={() => (u.is_active ? confirm(`${u.name} 계정을 비활성화할까요? 로그인할 수 없게 됩니다.`) : true) && patch(u, { isActive: !u.is_active })}>
                      {u.is_active ? "비활성화" : "활성화"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint">일일 할당량: [분배 실행] 시 오늘(한국시간) 배정받을 수 있는 최대 건수. 직원 직접 접수 건은 포함하지 않습니다.</p>
    </div>
  );
}

function QuotaInput({ value, onSave }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const dirty = Number(v) !== value;
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      <input className="input" type="number" min={0} style={{ width: 80, minHeight: 32, padding: "2px 8px" }} value={v}
        onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && dirty && onSave(Number(v) || 0)} aria-label="일일 할당량" />
      {dirty && <button className="btn btn-sm btn-primary" onClick={() => onSave(Number(v) || 0)}>저장</button>}
    </span>
  );
}
