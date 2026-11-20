import { useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";

/** 내 비밀번호 변경 (관리자·직원 공용) */
export default function AccountPage() {
  const { user } = useAuth();
  const [f, setF] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [msg, setMsg] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (f.newPassword !== f.confirm) return setMsg({ err: true, text: "새 비밀번호가 일치하지 않습니다." });
    try {
      await api("/auth/change-password", { method: "POST", body: { currentPassword: f.currentPassword, newPassword: f.newPassword } });
      setF({ currentPassword: "", newPassword: "", confirm: "" });
      setMsg({ text: "비밀번호가 변경되었습니다." });
    } catch (err) {
      setMsg({ err: true, text: err.message });
    }
  };

  return (
    <div style={{ maxWidth: 420 }}>
      <h2 className="page-title">내 계정</h2>
      <p className="hint">{user?.name} ({user?.loginId})</p>
      <form onSubmit={submit}>
        {[["currentPassword", "현재 비밀번호"], ["newPassword", "새 비밀번호 (8자 이상)"], ["confirm", "새 비밀번호 확인"]].map(([k, label]) => (
          <div className="field" key={k}>
            <label htmlFor={`acc-${k}`}>{label}</label>
            <input id={`acc-${k}`} type="password" className="input" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}
              autoComplete={k === "currentPassword" ? "current-password" : "new-password"} />
          </div>
        ))}
        {msg && <p className={msg.err ? "err" : "hint"} role="status">{msg.text}</p>}
        <button className="btn btn-primary">변경</button>
      </form>
    </div>
  );
}
