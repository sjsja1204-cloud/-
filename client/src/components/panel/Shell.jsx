import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import Logo from "../site/Logo";
import "./panel.css";

/** 관리자·직원 화면 공통 틀. links = [[to, label, end?]] */
export default function Shell({ home, suffix, links }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  useEffect(() => { document.title = `${suffix} | 담아가넷`; }, [suffix]);
  const doLogout = async () => {
    await logout();
    nav("/login", { replace: true });
  };
  return (
    <div className="shell">
      <header className="shell-top">
        <div className="shell-top-row">
          <Logo to={home} suffix={suffix} />
          <nav className="shell-nav">
            {links.map(([to, label, end]) => (
              <NavLink key={to} to={to} end={end}>{label}</NavLink>
            ))}
          </nav>
          <div className="shell-user">
            <span className="uname">{user?.name}님</span>
            <button className="btn btn-sm" onClick={doLogout}>로그아웃</button>
          </div>
        </div>
      </header>
      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  );
}
