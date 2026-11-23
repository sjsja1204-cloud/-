import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import SiteLayout from "../components/site/SiteLayout";

// 새 버전 배포 후 예전 화면 코드가 열려 있던 탭은 새 메뉴 주소(예: /reviews)를 모른다.
// 404 가 나면 그 주소당 한 번만 새로고침해서 최신 코드를 받아 온다 (진짜 없는 주소면 두 번째에 404 표시).
const KEY = "nf-reload:";

function tryReload(path) {
  try {
    if (sessionStorage.getItem(KEY + path)) return false;
    sessionStorage.setItem(KEY + path, "1");
  } catch {
    return false; // 저장소를 못 쓰면 새로고침 반복을 막을 수 없으니 하지 않는다
  }
  window.location.reload();
  return true;
}

export default function NotFound() {
  const { pathname } = useLocation();
  const [reloading, setReloading] = useState(() => pathname !== "/404" && tryReload(pathname));
  useEffect(() => {
    if (!reloading) return;
    const t = setTimeout(() => setReloading(false), 4000); // 새로고침이 막혔으면 404 안내 표시
    return () => clearTimeout(t);
  }, [reloading]);

  if (reloading) return null;
  return (
    <SiteLayout title="페이지를 찾을 수 없음">
      <div className="site-inner doc" style={{ textAlign: "center", padding: "72px 16px" }}>
        <p style={{ fontSize: 56, fontWeight: 800, color: "var(--brand)", margin: 0 }}>404</p>
        <h1>페이지를 찾을 수 없습니다</h1>
        <p>주소가 바뀌었거나 삭제된 페이지입니다.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>홈으로 가기</Link>
      </div>
    </SiteLayout>
  );
}
