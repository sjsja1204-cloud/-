// 상단 메뉴는 관리자 > 메인 화면 > 상단 메뉴 (site_content.menu) 에서 관리 — lib/siteData.jsx useMenu()

/**
 * 실시간 접수 현황 롤링.
 * 최근 30일 실제 접수가 minRealItems 건 미만이면 혜택 안내 문구(관리자 > 메인 화면)를 대신 보여준다.
 * (실제로 없는 접수를 만들어 보여주지 않음 — 거짓·기만 광고 방지)
 */
export const ticker = { minRealItems: 5 };
