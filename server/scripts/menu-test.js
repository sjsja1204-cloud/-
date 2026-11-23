// 상단 메뉴 개편 완료 기준 자동 점검
// 로컬/스테이징 전용 — 콘텐츠를 바꿨다가 원래대로 되돌린다.
// 사용: API=http://localhost:4000 ADMIN_ID=admin ADMIN_PW=... node --env-file-if-exists=.env scripts/menu-test.js
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
    const headers = { "X-Forwarded-For": `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` };
    if (cookie) headers.Cookie = cookie;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const res = await fetch(API + "/api" + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const sc = res.headers.get("set-cookie");
    if (sc) cookie = sc.split(";")[0];
    return { status: res.status, data: await res.json().catch(() => null) };
  };
}
const clone = (v) => JSON.parse(JSON.stringify(v));

const admin = client();
const pub = client();
let r = await admin("/auth/login", { method: "POST", body: { loginId: process.env.ADMIN_ID, password: process.env.ADMIN_PW } });
if (r.status !== 200) throw new Error("관리자 로그인 실패 — ADMIN_ID / ADMIN_PW 확인");

const backup = (await pool.query("SELECT key, draft, published FROM site_content WHERE key IN ('menu','plans')")).rows;
const verBefore = (await pool.query("SELECT max(id) AS m FROM content_versions")).rows[0].m || 0;

try {
  console.log("1) 기본 메뉴 구성");
  const site = (await pub("/site")).data;
  const items = site.menu?.items || [];
  const by = (l) => items.find((m) => m.label === l);
  ok(["SK인터넷", "KT인터넷", "LG인터넷"].every((l, i) => items[i]?.label === l && items[i].to === `/internet/${["sk", "kt", "lg"][i]}`), "SK·KT·LG 인터넷 → /internet/sk|kt|lg", items.slice(0, 3));
  ok(by("알뜰상품")?.children.map((c) => c.to).join() === "/internet/skylife,/internet/hellovision", "알뜰상품 드롭다운: 스카이라이프·LG헬로비전");
  ok(by("꿀팁게시판")?.to === "/tips" && by("꿀팁게시판").enabled === false, "꿀팁게시판 /tips, 기본 꺼짐");
  ok(items.map((m) => m.label).join("/") === "SK인터넷/KT인터넷/LG인터넷/알뜰상품/후기/고객센터/꿀팁게시판", "메뉴 순서: SK·KT·LG·알뜰상품·후기·고객센터 (+꿀팁 꺼짐)", items.map((m) => m.label));
  ok(by("후기")?.to === "/reviews" && by("고객센터")?.to === "/support" && by("후기").enabled && by("고객센터").enabled, "후기 /reviews, 고객센터 /support");
  ok(!by("커뮤니티"), "커뮤니티 드롭다운 삭제");
  ok(!items.some((m) => /렌탈/.test(m.label)), "렌탈 메뉴 없음");

  console.log("2) 숨김 통신사 — 공개 요금 데이터(메뉴·견적 위젯의 원천)에서 빠짐");
  let plans = (await pub("/plans")).data;
  const ids = () => plans.carriers.map((c) => c.id);
  const hv0 = plans.carriers.find((c) => c.id === "hellovision");
  const hvRows = hv0?.priceTable.rows || [];
  ok(hvRows.length === 4 && hvRows.filter((x) => x.speed).length === 3 && hvRows.every((x) => x.internetOnly), "LG헬로비전 공개 + 속도별 요금 3행(간편 견적) + 160메가(인터넷 단독)", ids());
  const adminPlans = (await admin("/admin/content/plans")).data.published;
  const ph = clone(adminPlans);
  ph.carriers.find((c) => c.id === "hellovision").hidden = true;
  r = await admin("/admin/content/plans/publish", { method: "POST", body: { data: ph } });
  plans = (await pub("/plans")).data;
  ok(r.status === 200 && !ids().includes("hellovision"), "LG헬로비전 숨김 게시 → /api/plans 에서 빠짐", ids());

  console.log("3) 데이터 없는 통신사 공개 허용 + 소개 문구·대표 혜택 반영");
  const p1 = clone(adminPlans);
  const hv = p1.carriers.find((c) => c.id === "hellovision");
  hv.hidden = false;
  hv.priceTable = { ...hv.priceTable, tvPlans: [], rows: [] };
  hv.discountTables = [];
  const kt = p1.carriers.find((c) => c.id === "kt");
  kt.intro = "테스트 KT 소개 문구";
  kt.highlights = ["테스트 혜택 1", "테스트 혜택 2"];
  r = await admin("/admin/content/plans/publish", { method: "POST", body: { data: p1 } });
  ok(r.status === 200, "요금 데이터 없는 LG헬로비전 공개 게시 허용", r.data);
  plans = (await pub("/plans")).data;
  const hvPub = plans.carriers.find((c) => c.id === "hellovision");
  ok(hvPub && !hvPub.priceTable.rows.length, "공개 후 /api/plans 에 LG헬로비전 (요금 행 없음 → 준비중 화면)");
  const ktPub = plans.carriers.find((c) => c.id === "kt");
  ok(ktPub.intro === "테스트 KT 소개 문구" && ktPub.highlights.length === 2, "KT 소개 문구·대표 혜택 게시 즉시 반영", ktPub.highlights);

  const p2 = clone(p1);
  p2.carriers.find((c) => c.id === "kt").priceTable.rows[0].prices[0] = 12345;
  r = await admin("/admin/content/plans/publish", { method: "POST", body: { data: p2 } });
  plans = (await pub("/plans")).data;
  ok(r.status === 200 && plans.carriers.find((c) => c.id === "kt").priceTable.rows[0].prices[0] === 12345, "요금표 수정·게시 → 통신사 페이지 데이터 즉시 반영");

  const p3 = clone(p1);
  p3.carriers.find((c) => c.id === "kt").highlights = ["좋음", " "];
  r = await admin("/admin/content/plans/publish", { method: "POST", body: { data: p3 } });
  ok(r.status === 400, "빈 대표 혜택 문구 → 게시 거부", r.status);

  console.log("4) 메뉴 이름·순서·켜기/끄기 게시 반영");
  const m0 = (await admin("/admin/content/menu")).data.published;
  const m1 = clone(m0);
  m1.items[0].label = "SK 테스트";
  [m1.items[1], m1.items[2]] = [m1.items[2], m1.items[1]];
  m1.items.find((m) => m.to === "/tips").enabled = true;
  m1.items.find((m) => m.label === "후기").enabled = false;
  m1.items.find((m) => m.label === "알뜰상품").children[0].enabled = false;
  r = await admin("/admin/content/menu/draft", { method: "PUT", body: { data: m1 } });
  ok(r.status === 200, "임시저장", r.status);
  ok((await pub("/site")).data.menu.items[0].label === "SK인터넷", "임시저장만으로는 공개 메뉴 그대로");
  r = await admin("/admin/content/menu/publish", { method: "POST", body: { data: m1 } });
  ok(r.status === 200, "게시", r.data);
  const live = (await pub("/site")).data.menu.items;
  ok(live[0].label === "SK 테스트", "이름 변경 반영");
  ok(live[1].to === "/internet/lg" && live[2].to === "/internet/kt", "순서 변경 반영");
  ok(live.find((m) => m.to === "/tips").enabled && !live.find((m) => m.label === "후기").enabled, "꿀팁 켜기 · 후기 끄기 반영");
  ok(live.find((m) => m.label === "알뜰상품").children[0].enabled === false, "하위 메뉴 끄기 반영");

  console.log("5) 메뉴 검증");
  const bad = (f) => { const x = clone(m0); f(x); return admin("/admin/content/menu/publish", { method: "POST", body: { data: x } }); };
  ok((await bad((x) => x.items.forEach((m) => (m.enabled = false)))).status === 400, "켜진 메뉴 0개 → 거부");
  ok((await bad((x) => (x.items[0].label = " "))).status === 400, "빈 메뉴 이름 → 거부");
  ok((await bad((x) => (x.items[0].to = ""))).status === 400, "하위 없는 메뉴에 링크 없음 → 거부");
  ok((await bad((x) => (x.items[3].children[0].to = "javascript:alert(1)"))).status === 400, "잘못된 하위 링크 → 거부");
  ok((await bad((x) => x.items.push(...Array(10).fill(x.items[0])))).status === 400, "메뉴 10개 초과 → 거부");

  console.log("6) 권한");
  r = await pub("/admin/content/menu/publish", { method: "POST", body: { data: m0 } });
  ok(r.status === 401, "비로그인 메뉴 게시 → 401", r.status);
} finally {
  for (const b of backup) {
    await admin(`/admin/content/${b.key}/publish`, { method: "POST", body: { data: b.published } });
    await pool.query("UPDATE site_content SET draft = $2 WHERE key = $1", [b.key, b.draft]);
  }
  await pool.query("DELETE FROM content_versions WHERE id > $1", [verBefore]);
  await pool.end();
  console.log("\n(테스트 데이터 정리 완료)");
}
console.log(`\n결과: ${pass} 통과, ${fail} 실패`);
process.exit(fail ? 1 : 0);
