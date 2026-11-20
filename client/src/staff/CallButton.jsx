import { useState } from "react";
import { api } from "../lib/api";

/**
 * 전화걸기: 누를 때마다 서버에 원본 번호를 1건 요청(접근 기록 남음) → tel: 링크로 이동.
 * 화면에는 원본 번호를 표시하지 않는다.
 */
export default function CallButton({ leadId, className = "btn btn-sm btn-primary", label = "전화걸기" }) {
  const [busy, setBusy] = useState(false);
  const call = async (e) => {
    e.stopPropagation();
    setBusy(true);
    try {
      const { phone } = await api(`/staff/leads/${leadId}/phone`, { method: "POST" });
      window.location.href = `tel:${phone}`;
    } catch (er) {
      alert(er.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button className={className} onClick={call} disabled={busy}>
      📞 {busy ? "연결 중…" : label}
    </button>
  );
}
