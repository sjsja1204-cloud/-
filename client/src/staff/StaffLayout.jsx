import Shell from "../components/panel/Shell";
import "./staff.css";

// TODO(확인필요): 의뢰인 참고 영상 분석 결과에 따라 화면 구성 조정 예정 — 각 부분을 작은 컴포넌트로 분리해 둠
export default function StaffLayout() {
  return (
    <Shell
      home="/staff"
      suffix="상담"
      links={[
        ["/staff", "내 DB", true],
        ["/staff/new", "직접 접수"],
        ["/staff/account", "내 계정"],
      ]}
    />
  );
}
