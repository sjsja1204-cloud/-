import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Logo from "../components/site/Logo";
import "../components/site/site.css";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { document.title = "로그인 | 담아가넷"; }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(loginId.trim(), password);
      const next = sp.get("next");
      const home = user.role === "admin" ? "/admin" : "/staff";
      // 관리자는 직원 화면(/staff)으로 돌아가는 것도 허용
      const allowed = user.role === "admin" ? ["/admin", "/staff"] : ["/staff"];
      const ok = next && allowed.some((p) => next === p || next.startsWith(p + "/") || next.startsWith(p + "?"));
      nav(ok ? next : home, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg-soft)", padding: 16 }}>
      <form onSubmit={submit} style={{ width: "min(360px, 100%)", background: "#fff", padding: 28, borderRadius: 14, border: "1px solid var(--line)" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}><Logo /></div>
        <p className="hint" style={{ textAlign: "center", marginTop: -8 }}>관리자 · 직원 로그인</p>
        <div className="field">
          <label htmlFor="lid">아이디</label>
          <input id="lid" className="input" value={loginId} onChange={(e) => setLoginId(e.target.value)} autoComplete="username" autoFocus />
        </div>
        <div className="field">
          <label htmlFor="lpw">비밀번호</label>
          <input id="lpw" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block btn-lg" disabled={busy || !loginId || !password}>{busy ? "로그인 중…" : "로그인"}</button>
      </form>
    </div>
  );
}
