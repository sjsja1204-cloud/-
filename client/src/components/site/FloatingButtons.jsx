import { business } from "../../config/business";

/** 우측 하단 플로팅 버튼: 상담 신청 (+ 대표번호가 있으면 전화) */
export default function FloatingButtons() {
  const scrollToForm = () => document.getElementById("apply")?.scrollIntoView({ behavior: "smooth" });
  return (
    <div className="floating">
      {business.phone && (
        <a className="fab fab-call" href={`tel:${business.phone.replace(/[^\d+]/g, "")}`} aria-label={`전화 상담 ${business.phone}`}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>
          <span>전화</span>
        </a>
      )}
      <button className="fab fab-apply" onClick={scrollToForm}>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden><path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2zm3 5v2h10V9zm0 4v2h7v-2z"/></svg>
        <span>상담신청</span>
      </button>
    </div>
  );
}
