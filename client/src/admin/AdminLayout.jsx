import Shell from "../components/panel/Shell";

export default function AdminLayout() {
  return (
    <Shell
      home="/admin"
      suffix="관리자"
      links={[
        ["/admin", "DB 목록", true],
        ["/admin/upload", "엑셀 업로드"],
        ["/admin/users", "직원 관리"],
        ["/admin/stats", "통계"],
        ["/admin/posts", "게시판 관리"],
        ["/admin/reviews", "후기"],
        ["/admin/faq", "자주 묻는 질문"],
        ["/admin/plans", "요금표"],
        ["/admin/popups", "팝업"],
        ["/admin/site", "메인 화면"],
        ["/admin/settings", "사이트 설정"],
        ["/admin/account", "내 계정"],
      ]}
    />
  );
}
