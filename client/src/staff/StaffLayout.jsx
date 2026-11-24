import { useEffect, useState } from "react";
import Shell from "../components/panel/Shell";
import { api } from "../lib/api";
import "./staff.css";

// TODO(확인필요): 의뢰인 참고 영상 분석 결과에 따라 화면 구성 조정 예정 — 각 부분을 작은 컴포넌트로 분리해 둠
export default function StaffLayout() {
  // 질문/답변 메뉴는 관리자 설정에서 '직원 답변 권한'을 켰을 때만
  const [qna, setQna] = useState(false);
  useEffect(() => { api("/staff/qna/access").then((d) => setQna(d.allowed)).catch(() => setQna(false)); }, []);
  return (
    <Shell
      home="/staff"
      suffix="상담"
      links={[
        ["/staff", "내 DB", true],
        ["/staff/new", "직접 접수"],
        ...(qna ? [["/staff/qna", "질문/답변"]] : []),
        ["/staff/account", "내 계정"],
      ]}
    />
  );
}
