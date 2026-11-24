import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api } from "../lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined=확인중, null=비로그인

  const refresh = useCallback(async () => {
    try {
      const { user } = await api("/auth/me");
      setUser(user);
    } catch {
      setUser(null);
    }
  }, []);

  const login = async (loginId, password) => {
    const { user } = await api("/auth/login", { method: "POST", body: { loginId, password } });
    setUser(user);
    return user;
  };
  const logout = async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
  };

  return <AuthCtx.Provider value={{ user, refresh, login, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

/** 역할별 화면 보호 (서버에서도 권한을 검사하므로 화면 보호는 편의용) */
export function RequireRole({ role, children }) {
  const { user, refresh } = useAuth();
  const loc = useLocation();
  useEffect(() => {
    if (user === undefined) refresh();
  }, [user, refresh]);

  if (user === undefined) return <div className="center-msg">확인 중…</div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  if (user.role !== role) {
    return (
      <div className="center-msg">
        <p>이 화면에 접근할 권한이 없습니다.</p>
        <a href={user.role === "admin" ? "/admin" : "/staff"}>내 화면으로 이동</a>
      </div>
    );
  }
  return children;
}
