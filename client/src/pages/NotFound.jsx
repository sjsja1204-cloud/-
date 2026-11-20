import { Link } from "react-router-dom";
import SiteLayout from "../components/site/SiteLayout";

export default function NotFound() {
  return (
    <SiteLayout>
      <div className="site-inner doc" style={{ textAlign: "center", padding: "72px 16px" }}>
        <p style={{ fontSize: 56, fontWeight: 800, color: "var(--accent)", margin: 0 }}>404</p>
        <h1>페이지를 찾을 수 없습니다</h1>
        <p>주소가 바뀌었거나 삭제된 페이지입니다.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>홈으로 가기</Link>
      </div>
    </SiteLayout>
  );
}
