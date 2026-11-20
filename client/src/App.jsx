import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { RequireRole } from "./auth/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";

// 관리자/직원 화면은 고객 페이지 번들에 포함되지 않도록 분리
const AdminLayout = lazy(() => import("./admin/AdminLayout"));
const LeadsPage = lazy(() => import("./admin/LeadsPage"));
const UploadPage = lazy(() => import("./admin/UploadPage"));
const UsersPage = lazy(() => import("./admin/UsersPage"));
const StatsPage = lazy(() => import("./admin/StatsPage"));
const StaffLayout = lazy(() => import("./staff/StaffLayout"));
const MyLeadsPage = lazy(() => import("./staff/MyLeadsPage"));
const StaffCreatePage = lazy(() => import("./staff/StaffCreatePage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));

export default function App() {
  return (
    <Suspense fallback={<div className="center-msg">불러오는 중…</div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />

        <Route path="/admin" element={<RequireRole role="admin"><AdminLayout /></RequireRole>}>
          <Route index element={<LeadsPage />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="account" element={<AccountPage />} />
        </Route>

        <Route path="/staff" element={<RequireRole role="staff"><StaffLayout /></RequireRole>}>
          <Route index element={<MyLeadsPage />} />
          <Route path="new" element={<StaffCreatePage />} />
          <Route path="account" element={<AccountPage />} />
        </Route>

        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

