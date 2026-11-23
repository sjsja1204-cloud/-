// 추가 지시서 3 (결합할인 사용 · 메뉴/후기/고객센터 · 접수 창 2단계) 완료 기준 자동 점검
// 로컬/스테이징 전용 — 테스트 후기·FAQ·접수(010-5550-xxxx)를 만들었다가 지우고, 설정을 원래대로 되돌린다.
// 사용: API=http://localhost:4000 ADMIN_ID=admin ADMIN_PW=... node --env-file-if-exists=.env scripts/support-test.js
import { pool } from "../src/db.js";

const API = process.env.API || "http://localhost:4000";
let pass = 0, fail = 0;
const ok = (cond, msg, extra) => {
  if (cond) { pass++; console.log("  ✔", msg); }
  else { fail++; console.log("  ✘", msg, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ""); }
};
function client() {
  let cookie = "";
  return async (p, { method = "GET", body } = {}) => {
    const headers = { "X-Forwarded-For": `10.7.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` };
    if (cookie) headers.Cookie = cookie;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const res = await fetch(API + "/api" + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const sc = res.headers.get("set-cookie");
    if (sc) cookie = sc.split(";")[0];
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data, text };
  };
}

const admin = client();
const pub = client();
let r = await admin("/auth/login", { method: "POST", body: { loginId: process.env.ADMIN_ID, password: process.env.ADMIN_PW } });
if (r.status !== 200) throw new Error("관리자 로그인 실패 — ADMIN_ID / ADMIN_PW 확인");

const settingsBackup = (await pool.query("SELECT key, value FROM site_settings WHERE key = 'business'")).rows;
const reviewIdsBefore = new Set((await pool.query("SELECT id FROM reviews")).rows.map((x) => x.id));
const faqIdsBefore = new Set((await pool.query("SELECT id FROM faqs")).rows.map((x) => x.id));
const PHONE = (n) => `0105550${String(n).padStart(4, "0")}`;
const lead = (n, extra) => pub("/public/leads", { method: "POST", body: { name: "지시서3테스트", phone: PHONE(n), consent: true, ...extra } });
const row = async (n) => (await pool.query("SELECT * FROM leads WHERE phone = $1", [PHONE(n)])).rows[0];

try {
  console.log("1) 결합할인 사용 (스카이라이프·LG헬로비전 꺼짐)");
  const plans = (await pub("/plans")).data;
  const by = (id) => plans.carriers.find((c) => c.id === id);
  ok(by("skylife")?.bundle === false && by("hellovision")?.bundle === false, "스카이라이프·LG헬로비전 결합할인 꺼짐");
  ok(["kt", "lg", "sk"].every((id) => by(id)?.bundle === true), "KT·LG·SK 결합할인 켜짐");

  console.log("2) 접수 창 — 결합할인 꺼진 통신사");
  r = await lead(31, { inquiryType: "consult", quote: { carrier: "hellovision", service: "internet_tv_usim" } });
  ok(r.status === 400, "LG헬로비전 인터넷+TV+유심 → 거부", r.status);
  r = await lead(32, { inquiryType: "consult", quote: { carrier: "skylife", service: "internet_tv", mobileBundle: true } });
  ok(r.status === 400, "스카이라이프 휴대폰 결합 → 거부", r.status);
  const hv = by("hellovision");
  const hvRow = hv.priceTable.rows[hv.priceTable.rows.length - 1];
  r = await lead(33, { inquiryType: "subsidy", quote: { carrier: "hellovision", service: "internet_tv", internetPlan: hvRow.internet, tvPlan: hv.priceTable.tvPlans[0], mobileBundle: null } });
  let l = await row(33);
  ok(r.status === 201 && l?.quote_internet_plan === hvRow.internet && l.quote_tv_plan === hv.priceTable.tvPlans[0] && l.quote_estimated_price === hvRow.prices[0] && l.quote_mobile_bundle === null,
    `LG헬로비전 ${hvRow.internet} + ${hv.priceTable.tvPlans[0]} → ${hvRow.prices[0]}원 저장, 결합 비움`, l);

  console.log("3) 접수 창 — 요금제 선택 저장 · 서버 재계산");
  const kt = by("kt");
  const ktRow = kt.priceTable.rows[1], ktTv = kt.priceTable.tvPlans[2];
  r = await lead(34, { inquiryType: "consult", quote: { carrier: "kt", service: "internet_tv", internetPlan: ktRow.internet, tvPlan: ktTv, mobileBundle: true } });
  l = await row(34);
  ok(r.status === 201 && l?.quote_estimated_price === ktRow.prices[2] && l.quote_speed === ktRow.speed && l.quote_mobile_bundle === true,
    `KT ${ktRow.internet} + ${ktTv} → 요금표 칸 ${ktRow.prices[2]}원, 속도·결합 저장`, l);
  ok(l?.carrier === "KT" && l.inquiry_type === "consult", "희망 통신사·접수 유형 함께 저장", l?.carrier);
  r = await lead(35, { inquiryType: "consult", quote: { carrier: "kt", service: "internet", internetPlan: ktRow.internet } });
  l = await row(35);
  ok(r.status === 201 && l?.quote_estimated_price === (ktRow.internetOnly ?? null) && l.quote_tv_plan === null, "인터넷만 → 인터넷 단독 요금, TV 요금제 비움", l);
  r = await lead(36, { inquiryType: "consult", quote: { carrier: "kt", service: "internet_tv" } });
  l = await row(36);
  ok(r.status === 201 && l?.quote_internet_plan === null && l.quote_estimated_price === null, "요금제 '추천받기'(미선택) → 요금 비움 (상담 시 안내)", l);
  r = await lead(37, { inquiryType: "recommend", quote: { carrier: "unknown", service: "internet_tv_usim", mobileBundle: true } });
  l = await row(37);
  ok(r.status === 201 && l?.quote_carrier === "잘 모르겠어요(추천받기)" && l.quote_mobile_bundle === true && l.carrier === null, "통신사 '잘 모르겠어요' → 추천 희망으로 저장", l);
  r = await lead(38, { inquiryType: "consult", quote: { carrier: "kt", service: "internet", internetPlan: "없는 요금제" } });
  ok(r.status === 400, "요금표에 없는 인터넷 요금제 → 거부", r.status);
  r = await lead(39, { inquiryType: "consult", quote: { carrier: "kt", service: "internet", internetPlan: ktRow.internet, tvPlan: ktTv } });
  ok(r.status === 400, "인터넷만인데 TV 요금제 → 거부", r.status);
  r = await lead(40, { inquiryType: "consult", quote: { carrier: "unknown", service: "internet", internetPlan: ktRow.internet } });
  ok(r.status === 400, "통신사 모름 + 요금제 → 거부", r.status);
  r = await lead(41, { inquiryType: "quote", quote: { carrier: "kt", service: "internet_tv", speed: "500M", internetPlan: kt.priceTable.rows.find((x) => x.speed !== "500M").internet } });
  ok(r.status === 400, "간편 견적 속도와 다른 속도의 요금제 → 거부", r.status);

  console.log("4) 관리자·직원 화면 · 엑셀에 요금제 표시");
  r = await admin("/admin/leads?q=지시서3테스트&pageSize=200");
  const li = r.data.items?.find((x) => x.phone === PHONE(34));
  ok(li?.quote_internet_plan === ktRow.internet && li.quote_tv_plan === ktTv, "관리자 DB 목록에 인터넷·TV 요금제 포함", li);
  r = await admin("/admin/leads/export?q=지시서3테스트");
  ok(r.status === 200, "엑셀 다운로드", r.status);
  // 엑셀 '견적조건' 열·텔레그램 알림·관리자/직원 화면은 같은 요약 규칙(quoteSummary)을 쓴다
  const { quoteSummary } = await import("../src/lib/constants.js");
  ok(quoteSummary(await row(34)).includes(ktRow.internet) && quoteSummary(await row(34)).includes(ktTv), "견적 조건 요약(엑셀·텔레그램·화면 공용)에 요금제 포함", quoteSummary(await row(34)));

  console.log("5) 후기");
  const mk = (o) => admin("/admin/reviews", { method: "POST", body: { customerName: "홍길동", carrier: "KT", product: "인터넷+TV", rating: 5, content: "테스트 후기", reviewDate: "2026-11-01", imageUrl: "", isPublished: true, ...o } });
  r = await mk({ rating: 6 });
  ok(r.status === 400, "별점 6 → 거부", r.status);
  r = await mk({ content: " " });
  ok(r.status === 400, "빈 후기 → 거부", r.status);
  r = await mk({ imageUrl: "javascript:alert(1)" });
  ok(r.status === 400, "잘못된 사진 주소 → 거부", r.status);
  const ids = [];
  for (let i = 0; i < 12; i++) {
    r = await mk({ customerName: i === 0 ? "남궁민수" : "홍길동", carrier: i % 3 ? "KT" : "SK브로드밴드", reviewDate: `2026-10-${String(10 + i).padStart(2, "0")}`, content: `테스트 후기 ${i}` });
    ids.push(r.data.id);
  }
  ok(ids.every(Boolean), "후기 12개 등록", ids);
  r = await pub("/public/reviews?limit=10");
  ok(r.data.items.length === 10 && r.data.total >= 12, "공개 목록 10개씩 + 전체 개수", { n: r.data.items.length, total: r.data.total });
  ok(r.data.items[0].content === "테스트 후기 11", "새로 등록한 후기가 맨 위 (최신순)", r.data.items[0]?.content);
  ok(!r.text.includes("홍길동") && !r.text.includes("남궁민수") && r.text.includes("홍*동"), "공개 API 는 가린 이름만 (홍*동)");
  r = await pub("/public/reviews?limit=10&offset=10");
  ok(r.data.items.some((x) => x.name === "남**수"), "더보기(offset) + 4글자 이름 가림 남**수", r.data.items.map((x) => x.name));
  r = await pub("/public/reviews?carrier=" + encodeURIComponent("SK브로드밴드"));
  ok(r.data.items.length === 4 && r.data.items.every((x) => x.carrier === "SK브로드밴드") && r.data.carriers.includes("KT"), "통신사별 필터 + 필터 목록", r.data.items.length);
  const target = (await admin("/admin/reviews")).data.items.find((x) => x.id === ids[5]);
  r = await admin(`/admin/reviews/${ids[5]}`, { method: "PUT", body: { customerName: target.customer_name, carrier: target.carrier, product: target.product, rating: 3, content: target.content, reviewDate: target.review_day, imageUrl: "", isPublished: false } });
  r = await pub("/public/reviews?limit=30");
  ok(!r.data.items.some((x) => x.id === ids[5]), "숨긴 후기는 공개 목록에서 빠짐");
  const all = (await admin("/admin/reviews")).data.items.map((x) => x.id);
  const reordered = [ids[0], ...all.filter((id) => id !== ids[0])];
  r = await admin("/admin/reviews/order", { method: "PUT", body: { ids: reordered } });
  ok(r.status === 200 && (await pub("/public/reviews?limit=1")).data.items[0].id === ids[0], "순서 변경 → 공개 순서 반영");
  r = await admin("/admin/reviews/order", { method: "PUT", body: { ids: reordered.slice(1) } });
  ok(r.status === 409, "일부만 보낸 순서 → 거부(새로고침 안내)", r.status);
  r = await admin("/admin/reviews/sort-by-date", { method: "POST" });
  ok(r.status === 200 && (await pub("/public/reviews?limit=1")).data.items[0].date >= "2026-10-21", "작성일순 정렬", (await pub("/public/reviews?limit=1")).data.items[0]?.date);
  r = await admin(`/admin/reviews/${ids[1]}`, { method: "DELETE" });
  ok(r.status === 200 && (await admin(`/admin/reviews/${ids[1]}`, { method: "DELETE" })).status === 404, "후기 삭제");

  console.log("6) 자주 묻는 질문");
  const mf = (o) => admin("/admin/faqs", { method: "POST", body: { category: "설치", question: "테스트 질문", answer: "테스트 답변", isPublished: true, ...o } });
  r = await mf({ category: "없는분류" });
  ok(r.status === 400, "없는 분류 → 거부", r.status);
  r = await mf({ answer: "" });
  ok(r.status === 400, "빈 답변 → 거부", r.status);
  const f1 = (await mf({ question: "테스트 질문 1", category: "가입" })).data.id;
  const f2 = (await mf({ question: "테스트 질문 2", category: "사은품" })).data.id;
  const f3 = (await mf({ question: "테스트 질문 3", isPublished: false })).data.id;
  r = await pub("/public/faqs");
  const qs = r.data.items.map((x) => x.question);
  ok(qs.indexOf("테스트 질문 1") < qs.indexOf("테스트 질문 2") && !qs.includes("테스트 질문 3"), "새 질문은 아래에 추가, 숨김은 공개 안 함");
  ok(JSON.stringify(r.data.categories) === JSON.stringify(["가입", "설치", "사은품", "해지·변경", "기타"]), "분류 5개 (가입·설치·사은품·해지·변경·기타)");
  const fAll = (await admin("/admin/faqs")).data.items.map((x) => x.id);
  const fOrder = [f2, ...fAll.filter((id) => id !== f2)];
  r = await admin("/admin/faqs/order", { method: "PUT", body: { ids: fOrder } });
  ok(r.status === 200 && (await pub("/public/faqs")).data.items[0].id === f2, "질문 순서 변경 반영");
  for (const id of [f1, f2, f3]) await admin(`/admin/faqs/${id}`, { method: "DELETE" });

  console.log("7) 고객센터 설정 · 권한");
  const biz = (await admin("/admin/settings")).data.business;
  r = await admin("/admin/settings/business", { method: "PUT", body: { ...biz, kakaoUrl: "http://pf.kakao.com/x" } });
  ok(r.status === 400, "카카오톡 채널 주소 http:// → 거부", r.status);
  r = await admin("/admin/settings/business", { method: "PUT", body: { ...biz, kakaoUrl: "https://pf.kakao.com/_test" } });
  ok(r.status === 200 && (await pub("/settings/public")).data.business.kakaoUrl === "https://pf.kakao.com/_test", "카카오톡 채널 주소 저장 → 공개 설정 반영");
  for (const [m, p] of [["GET", "/admin/reviews"], ["POST", "/admin/reviews"], ["PUT", "/admin/faqs/order"], ["DELETE", "/admin/faqs/1"]]) {
    r = await pub(p, { method: m, body: m === "GET" || m === "DELETE" ? undefined : {} });
    ok(r.status === 401, `비로그인 ${m} ${p} → 401`, r.status);
  }
} finally {
  await pool.query("DELETE FROM reviews WHERE NOT (id = ANY($1::int[]))", [[...reviewIdsBefore]]);
  await pool.query("DELETE FROM faqs WHERE NOT (id = ANY($1::int[]))", [[...faqIdsBefore]]);
  for (const s of settingsBackup) await admin(`/admin/settings/${s.key}`, { method: "PUT", body: s.value });
  await pool.query("DELETE FROM leads WHERE phone LIKE '0105550%'");
  await pool.end();
  console.log("\n(테스트 데이터 정리 완료)");
}
console.log(`\n결과: ${pass} 통과, ${fail} 실패`);
process.exit(fail ? 1 : 0);
