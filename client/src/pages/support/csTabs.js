// 고객센터 하위 페이지 탭 (상단 메뉴 '고객센터' 드롭다운과 같은 구성)
export const csTabs = [
  { label: "고객센터 안내", to: "/support" },
  { label: "자주 묻는 질문", to: "/support/faq" },
  { label: "질문/답변", to: "/support/qna", end: false }, // 글 보기·작성 화면에서도 켜짐
];
