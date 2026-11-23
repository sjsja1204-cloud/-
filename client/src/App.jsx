import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { RequireRole } from "./auth/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import InternetPage from "./pages/InternetPage";
import CarrierPage from "./pages/CarrierPage";
import MobilePage from "./pages/MobilePage";
import BundlePage from "./pages/BundlePage";
import EventPage from "./pages/EventPage";
import NoticeList from "./pages/support/NoticeList";
import PostDetail from "./pages/support/PostDetail";
import ReviewsPage from "./pages/support/ReviewsPage";
import FaqPage from "./pages/support/FaqPage";
import ApplyPage from "./pages/support/ApplyPage";
import ComingSoonPage from "./pages/ComingSoonPage";

// 관리자/직원 화면은 고객 페이지 번들에 포함되지 않도록 분리
const AdminLayout = lazy(() => import("./admin/AdminLayout"));
const LeadsPage = lazy(() => import("./admin/LeadsPage"));
const UploadPage = lazy(() => import("./admin/UploadPage"));
const UsersPage = lazy(() => import("./admin/UsersPage"));
const StatsPage = lazy(() => import("./admin/StatsPage"));
const StaffLayout = lazy(() => import("./staff/StaffLayout"));
const MyLeadsPage = lazy(() => import("./staff/MyLeadsPage"));
const StaffCreatePage = lazy(() => import("./staff/StaffCreatePage"));
const PostsPage = lazy(() => import("./admin/PostsPage"));
const PlansPage = lazy(() => import("./admin/PlansPage"));
const PopupsPage = lazy(() => import("./admin/PopupsPage"));
const SitePage = lazy(() => import("./admin/SitePage"));
const SettingsPage = lazy(() => import("./admin/SettingsPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));

export default function App() {
  return (
    <Suspense fallback={<div className="center-msg">불러오는 중…</div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/internet" element={<InternetPage />} />
        <Route path="/internet/:carrierId" element={<CarrierPage />} />
        <Route path="/mobile" element={<MobilePage />} />
        <Route path="/bundle" element={<BundlePage />} />
        <Route path="/event" element={<EventPage />} />
        <Route path="/event/:id" element={<PostDetail board="event" />} />
        <Route path="/support" element={<NoticeList />} />
        <Route path="/support/notice" element={<NoticeList />} />
        <Route path="/support/notice/:id" element={<PostDetail board="notice" />} />
        <Route path="/support/reviews" element={<ReviewsPage />} />
        <Route path="/support/faq" element={<FaqPage />} />
        <Route path="/apply" element={<ApplyPage />} />
        {/* 꿀팁게시판·커뮤니티: 게시판은 2차 범위, 지금은 준비중 안내 */}
        <Route path="/tips" element={<ComingSoonPage title="꿀팁게시판" />} />
        <Route path="/community" element={<ComingSoonPage title="커뮤니티" />} />
        <Route path="/community/faq" element={<ComingSoonPage title="자주 묻는 질문" crumbs={[["커뮤니티"], ["자주 묻는 질문"]]} />} />
        <Route path="/community/reviews" element={<ComingSoonPage title="이용 후기" crumbs={[["커뮤니티"], ["이용 후기"]]} />} />
        <Route path="/community/events" element={<ComingSoonPage title="이벤트" crumbs={[["커뮤니티"], ["이벤트"]]} />} />

        <Route path="/admin" element={<RequireRole role="admin"><AdminLayout /></RequireRole>}>
          <Route index element={<LeadsPage />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="posts" element={<PostsPage />} />
          <Route path="plans" element={<PlansPage />} />
          <Route path="popups" element={<PopupsPage />} />
          <Route path="site" element={<SitePage />} />
          <Route path="settings" element={<SettingsPage />} />
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

