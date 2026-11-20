// 첫 진입 이벤트 팝업 설정 (2차 범위에서 관리자 화면 편집으로 옮길 예정)
export const popup = {
  enabled: true,
  // id 를 바꾸면 '오늘 하루 보지 않기' 기록이 초기화된다 (새 이벤트로 교체 시 변경)
  id: "event-2026-11",
  // 노출 기간 (한국시간, YYYY-MM-DD). 비우면 제한 없음
  startDate: "2026-11-01",
  endDate: "2026-12-31",
  // 이미지가 있으면 이미지 팝업, 없으면 아래 텍스트로 표시
  image: "", // 예: "/images/event-2026-11.jpg" (client/public/images 에 넣기) TODO(확인필요): 이벤트 이미지
  imageAlt: "담아가넷 이벤트",
  // 클릭 시 이동 (#apply = 상담 신청 폼으로 스크롤, 외부 링크도 가능)
  link: "#apply",
  title: "인터넷 + TV 가입 이벤트",
  lines: ["신규 가입 시 최대 혜택 안내", "휴대폰 결합 할인까지 한 번에 상담"], // TODO(확인필요): 실제 이벤트 문구
  buttonText: "지금 상담 신청하기",
};
