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
        ["/admin/account", "내 계정"],
      ]}
    />
  );
}
