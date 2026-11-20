// 사이트 메뉴·메인 배너·롤링 문구 설정
// (2차 범위에서 관리자 편집으로 옮길 수 있도록 데이터만 모아 둠)

/** 상단 메뉴. children 이 있으면 드롭다운 */
export const menu = [
  {
    label: "인터넷·TV",
    to: "/internet",
    children: [
      { label: "통신사 한눈에 비교", to: "/internet" },
      { label: "KT", to: "/internet/kt" },
      { label: "LG U+", to: "/internet/lg" },
      { label: "SK브로드밴드", to: "/internet/sk" },
      { label: "KT스카이라이프", to: "/internet/skylife" },
    ],
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

/** 통신사 페이지 정보 (id 는 telecomPlans.js 의 carriers[].id 와 일치) */
export const carrierPages = {
  kt: { name: "KT", formCarrier: "KT", color: "#e4002b", tagline: "기가인터넷 대표 사업자, 안정적인 속도" },
  lg: { name: "LG U+", formCarrier: "LG U+", color: "#e6007e", tagline: "U+tv 콘텐츠와 휴대폰 결합 혜택" },
  sk: { name: "SK브로드밴드", formCarrier: "SK", color: "#ea002c", tagline: "B tv와 SKT 가족결합 할인" },
  skylife: { name: "KT스카이라이프", formCarrier: "KT스카이라이프", color: "#0066b3", tagline: "합리적인 요금의 인터넷+TV" },
};

/**
 * 메인 슬라이드 배너. image 가 있으면 우측에 표시 (client/public 아래 경로)
 * TODO(확인필요): 실제 이벤트 문구·이미지로 교체
 */
export const banners = [
  {
    kicker: "인터넷 · TV 신규 가입",
    title: "통신사 4곳 요금,\n한 번에 비교하고 가입하세요",
    desc: "KT · LG U+ · SK · 스카이라이프 최신 요금과 결합할인을 비교해 드려요.",
    cta: { label: "요금 비교하기", to: "/internet" },
    theme: "orange",
  },
  {
    kicker: "휴대폰 + 인터넷 결합",
    title: "가족 휴대폰과 묶으면\n매달 요금이 더 내려가요",
    desc: "가족 수·요금제에 맞는 결합 조합을 상담사가 직접 계산해 드립니다.",
    cta: { label: "결합할인 보기", to: "/bundle" },
    theme: "navy",
  },
  {
    kicker: "무료 상담",
    title: "약정 만료가 다가온다면\n지금 상담받아 보세요",
    desc: "위약금·잔여 약정까지 확인해서 손해 없는 방법으로 안내해 드려요.",
    cta: { label: "상담 신청", to: "/apply" },
    theme: "mint",
  },
];

/**
 * 실시간 접수 현황 롤링.
 * 최근 30일 실제 접수가 minRealItems 건 미만이면 아래 혜택 안내 문구를 대신 보여준다.
 * (실제로 없는 접수를 만들어 보여주지 않음 — 거짓·기만 광고 방지)
 * TODO(확인필요): 실제 혜택 문구로 교체
 */
export const ticker = {
  minRealItems: 5,
  promos: [
    { tag: "인터넷", text: "인터넷 신규 가입 시 사은품 혜택 안내" },
    { tag: "결합", text: "휴대폰 + 인터넷 결합 시 매달 요금 할인" },
    { tag: "TV", text: "인터넷 + TV 함께 가입하면 더 저렴하게" },
    { tag: "이사", text: "이사 예정이라면 이전 설치·신규 가입 비교 상담" },
    { tag: "약정", text: "약정 만료 고객 재약정 vs 신규 가입 비교" },
  ],
};
