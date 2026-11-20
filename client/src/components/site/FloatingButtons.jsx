import { useNavigate } from "react-router-dom";
import { business } from "../../config/business";
import Icon from "./Icon";

/** 우측 하단 플로팅 버튼: 상담 신청 (+ 대표번호가 있으면 전화) */
export default function FloatingButtons() {
  const nav = useNavigate();
  // 현재 페이지에 상담 폼이 있으면 그 위치로, 없으면 상담 신청 페이지로
  const goApply = () => {
    const el = document.getElementById("apply");
    if (el) el.scrollIntoView({ behavior: "smooth" });
    else nav("/apply");
  };
  return (
    <div className="floating">
      {business.phone && (
        <a className="fab fab-call" href={`tel:${business.phone.replace(/[^\d+]/g, "")}`} aria-label={`전화 상담 ${business.phone}`}>
          <Icon name="headset" />
          <span>전화</span>
        </a>
      )}
      <button className="fab fab-apply" onClick={goApply}>
        <Icon name="chat" />
        <span>상담신청</span>
      </button>
    </div>
  );
}
