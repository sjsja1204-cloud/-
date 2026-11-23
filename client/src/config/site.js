// 사이트 메뉴 구조 (자주 바뀌는 내용 — 요금표·배너·혜택 문구·사업자 정보 — 은 관리자 페이지에서 관리)

/** 상단 메뉴. children 이 있으면 드롭다운 */
export const menu = [
  {
    label: "인터넷·TV",
    to: "/internet",
    // 하위 메뉴는 관리자 > 요금표 관리의 공개 통신사로 자동 구성 (lib/siteData.jsx buildMenu)
    children: [],
  },
  { label: "휴대폰", to: "/mobile" },
  { label: "결합할인", to: "/bundle" },
  { label: "이벤트", to: "/event" },
  {
    label: "고객센터",
    to: "/support/notice",
    children: [
      { label: "공지사항", to: "/support/notice" },
      { label: "상담후기", to: "/support/reviews" },
      { label: "자주 묻는 질문", to: "/support/faq" },
      { label: "상담 신청", to: "/apply" },
    ],
  },
];

/**
 * 실시간 접수 현황 롤링.
 * 최근 30일 실제 접수가 minRealItems 건 미만이면 혜택 안내 문구(관리자 > 메인 화면)를 대신 보여준다.
 * (실제로 없는 접수를 만들어 보여주지 않음 — 거짓·기만 광고 방지)
 */
export const ticker = { minRealItems: 5 };
