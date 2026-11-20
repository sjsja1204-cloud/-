import LeadForm from "./LeadForm";
import Icon from "./Icon";

/** 페이지 하단 상담 신청 영역 (id="apply" — 플로팅 버튼·팝업이 이 위치로 이동) */
export default function ApplySection({ title = "무료 상담 신청", desc = "남겨주시면 전문 상담사가 빠르게 연락드립니다.", initial }) {
  return (
    <section id="apply" className="apply-sec">
      <div className="site-inner apply-grid">
        <div className="apply-intro">
          <p className="sec-kicker">FREE CONSULTING</p>
          <h2>{title}</h2>
          <p className="section-sub">{desc}</p>
          <ul className="apply-points">
            <li><Icon name="check" size={18} /> 상담은 무료, 가입은 원하실 때만</li>
            <li><Icon name="check" size={18} /> 통신사 4곳 요금·결합할인 비교</li>
            <li><Icon name="check" size={18} /> 위약금·잔여 약정까지 함께 확인</li>
          </ul>
        </div>
        <div className="apply-card">
          <LeadForm initial={initial} />
        </div>
      </div>
    </section>
  );
}
