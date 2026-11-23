import { useSiteData } from "../../lib/siteData";

/** 접수 폼의 '내용 보기' 펼침 문구 */
export default function PrivacyConsentText() {
  const { business: b } = useSiteData();
  const contact = [b.privacyOfficerName, b.privacyOfficerEmail && `(${b.privacyOfficerEmail})`].filter(Boolean).join(" ");
  return (
    <div className="consent-text">
      <p><b>1. 수집 항목</b> 이름, 연락처, 관심 상품, 희망 통신사, 간편 견적 조건(통신사·가입 서비스·속도·휴대폰 결합 여부), 통화 가능 시간, 문의 내용, 접속 정보(IP, 유입 경로)</p>
      <p><b>2. 수집·이용 목적</b> 휴대폰·인터넷·TV 가입 상담 및 안내 전화, 상담 이력 관리, 부정 이용 방지, 홈페이지 실시간 상담 현황 표시(이름 첫 글자·관심 상품·진행 상태만 표시, 연락처 미표시)</p>
      <p><b>3. 보유·이용 기간</b> 상담 완료 후 [확인필요: 예) 1년] 보관 후 파기. 단, 관계 법령에 따라 보존할 필요가 있는 경우 해당 기간 동안 보관</p>
      <p><b>4. 동의 거부 권리</b> 동의를 거부할 수 있으며, 거부 시 상담 신청이 제한됩니다.</p>
      {contact && <p>문의: {contact}</p>}
    </div>
  );
}
