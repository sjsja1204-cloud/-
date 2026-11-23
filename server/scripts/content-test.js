// 관리자 콘텐츠 관리 완료 기준 자동 점검 (로컬/스테이징 전용 — 끝나면 콘텐츠·설정을 원래대로 되돌린다)
// 사용: API=http://localhost:4000 ADMIN_ID=admin ADMIN_PW=... node --env-file-if-exists=.env scripts/content-test.js
import sharp from "sharp";
import { pool } from "../src/db.js";

const API = process.env.API || "http://localhost:4000";
let pass = 0, fail = 0;
const ok = (cond, msg, extra) => {
  if (cond) { pass++; console.log("  ✔", msg); }
  else { fail++; console.log("  ✘", msg, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ""); }
};
function client() {
  let cookie = "";
  return async (path, { method = "GET", body, form } = {}) => {
    const headers = { "X-Forwarded-For": `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` };
    if (cookie) headers.Cookie = cookie;
    let payload;
    if (form) payload = form;
    else if (body !== undefined) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
    const res = await fetch(API + "/api" + path, { method, headers, body: payload });
    const sc = res.headers.get("set-cookie");
    if (sc) cookie = sc.split(";")[0];
    const data = res.headers.get("content-type")?.includes("json") ? await res.json() : null;
    return { status: res.status, data, headers: res.headers };
  };
}
const clone = (v) => JSON.parse(JSON.stringify(v));

const admin = client();
const pub = client();
let r = await admin("/auth/login", { method: "POST", body: { loginId: process.env.ADMIN_ID, password: process.env.ADMIN_PW } });
if (r.status !== 200) throw new Error("관리자 로그인 실패 — ADMIN_ID / ADMIN_PW 확인");

// 원래 상태 백업
const backup = (await pool.query("SELECT key, draft, published FROM site_content")).rows;
const settingsBackup = (await pool.query("SELECT key, value FROM site_settings")).rows;
const verBefore = (await pool.query("SELECT max(id) AS m FROM content_versions")).rows[0].m || 0;
const popupBefore = (await pool.query("SELECT max(id) AS m FROM popups")).rows[0].m || 0;

try {
  console.log("1) KT 요금 변경 → 게시 전/후");
  const orig = (await admin("/admin/content/plans")).data.published;
  const kt0 = orig.carriers.find((c) => c.id === "kt").priceTable.rows[0].prices[0];
  const draft = clone(orig);
  draft.carriers.find((c) => c.id === "kt").priceTable.rows[0].prices[0] = kt0 + 1000;
  r = await admin("/admin/content/plans/draft", { method: "PUT", body: { data: draft } });
  ok(r.status === 200, "임시저장 200", r.data);
  const ktPub = async () => (await pub("/plans")).data.carriers.find((c) => c.id === "kt").priceTable.rows[0].prices[0];
  ok((await ktPub()) === kt0, "임시저장만 하면 공개 API 는 그대로");
  r = await admin("/admin/content/preview");
  ok(r.data.plans.carriers.find((c) => c.id === "kt").priceTable.rows[0].prices[0] === kt0 + 1000, "미리보기(관리자)에는 바뀐 값");
  r = await pub("/admin/content/preview");
  ok(r.status === 401, "비로그인 미리보기 → 401", r.status);
  r = await admin("/admin/content/plans/publish", { method: "POST", body: { data: draft } });
  ok(r.status === 200, "게시 200", r.data);
  ok((await ktPub()) === kt0 + 1000, "게시 즉시 공개 API 에 반영 (캐시 무효화)");

  console.log("2) 이전 버전으로 되돌리기");
  r = await admin("/admin/content/plans/versions");
  const prev = r.data.items[1];
  ok(r.data.items.length >= 2 && prev, "버전 목록 2개 이상");
  r = await admin(`/admin/content/plans/versions/${prev.id}/revert`, { method: "POST" });
  ok(r.status === 200, "되돌리기 200", r.data);
  ok((await ktPub()) === kt0, "되돌리면 공개 화면이 이전 값으로");

  console.log("3) 통신사 추가 → 행·열 → 요금 → 게시 (코드 수정 없이)");
  const withNew = clone(orig);
  const nc = {
    id: "test-tel", name: "테스트통신", hidden: false, color: "#123456", tagline: "테스트", formCarrier: "",
    priceTable: { title: "테스트 요금", desc: "", tvPlans: ["기본"], rows: [{ internet: "100M", prices: [10000] }], notes: [] },
    discountTables: [],
  };
  nc.priceTable.tvPlans.push("고급");
  nc.priceTable.rows.forEach((row) => row.prices.push(null)); // 열 추가 → 빈칸
  nc.priceTable.rows.push({ internet: "500M", prices: [null, null] }); // 행 추가 → 빈칸
  withNew.carriers.push(nc);
  r = await admin("/admin/content/plans/publish", { method: "POST", body: { data: withNew } });
  ok(r.status === 400 && r.data.issues?.length === 3, "빈칸 3개 있으면 게시 거부 + 위치 안내", r.data);
  nc.priceTable.rows[1].internetOnly = 20000; // 인터넷 단독 요금이 있는 행은 TV 칸을 비워도 됨
  r = await admin("/admin/content/plans/publish", { method: "POST", body: { data: withNew } });
  ok(r.status === 400 && r.data.issues?.length === 1, "단독 요금 있는 행의 빈 TV 칸은 허용 (남은 빈칸 1개만 거부)", r.data);
  nc.priceTable.rows[1].internetOnly = null;
  nc.priceTable.rows[0].prices[1] = 12000;
  nc.priceTable.rows[1].prices = [15000, 17000];
  r = await admin("/admin/content/plans/publish", { method: "POST", body: { data: withNew } });
  ok(r.status === 200, "빈칸 채우면 게시 성공", r.data);
  r = await pub("/plans");
  ok(r.data.carriers.some((c) => c.id === "test-tel" && c.priceTable.rows[1].prices[1] === 17000), "새 통신사가 공개 API 에 나옴");

  console.log("4) 요금 칸 숫자만");
  const bad = clone(withNew);
  bad.carriers.at(-1).priceTable.rows[0].prices[0] = "만원";
  r = await admin("/admin/content/plans/draft", { method: "PUT", body: { data: bad } });
  ok(r.status === 400, "요금에 글자 → 400", r.status);
  bad.carriers.at(-1).priceTable.rows[0].prices[0] = -5;
  r = await admin("/admin/content/plans/draft", { method: "PUT", body: { data: bad } });
  ok(r.status === 400, "음수 요금 → 400", r.status);

  console.log("5) 메인 문구 링크 검사");
  const hero = (await admin("/admin/content/hero")).data.published;
  const badHero = clone(hero);
  badHero.banners[0].cta.to = "javascript:alert(1)";
  r = await admin("/admin/content/hero/publish", { method: "POST", body: { data: badHero } });
  ok(r.status === 400, "버튼 링크 형식 오류 → 게시 거부", r.data);

  console.log("6) 팝업 기간");
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  r = await admin("/admin/popups", { method: "POST", body: { title: "지난 이벤트", startAt: "2020-01-01", endAt: "2020-01-31", link: "#apply" } });
  const expiredId = r.data?.id;
  r = await admin("/admin/popups", { method: "POST", body: { title: "오늘 이벤트", startAt: today, endAt: today, link: "/event" } });
  const todayId = r.data?.id;
  r = await admin("/admin/popups", { method: "POST", body: { title: "링크오류", link: "event page" } });
  ok(r.status === 400, "팝업 링크 형식 오류 → 400", r.status);
  r = await pub("/popups");
  ok(!r.data.items.some((p) => p.id === expiredId), "기간 지난 팝업은 안 나옴");
  ok(r.data.items.some((p) => p.id === todayId), "오늘까지인 팝업은 나옴");
  await admin(`/admin/popups/${todayId}/active`, { method: "PATCH", body: { isActive: false } });
  r = await pub("/popups");
  ok(!r.data.items.some((p) => p.id === todayId), "끄면 바로 안 나옴");

  console.log("7) 이미지 업로드");
  const png = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: "#f26a21" } }).png().toBuffer();
  let fd = new FormData();
  fd.append("file", new Blob([png], { type: "image/png" }), "a.png");
  r = await admin("/admin/media?kind=popup", { method: "POST", form: fd });
  ok(r.status === 201 && r.data.width <= 800, "png 업로드 + 자동 리사이즈(가로 800 이하)", r.data);
  fd = new FormData();
  fd.append("file", new Blob([Buffer.from("GIF89a....")], { type: "image/gif" }), "a.gif");
  r = await admin("/admin/media", { method: "POST", form: fd });
  ok(r.status === 400, "gif 거부", r.status);
  fd = new FormData();
  fd.append("file", new Blob([Buffer.alloc(2 * 1024 * 1024 + 10)], { type: "image/jpeg" }), "big.jpg");
  r = await admin("/admin/media", { method: "POST", form: fd });
  ok(r.status === 400 && /2MB/.test(r.data?.error), "2MB 초과 거부", r.data);

  console.log("8) 사업자 정보 · 폼 선택지");
  const biz = (await admin("/admin/settings")).data.business;
  r = await admin("/admin/settings/business", { method: "PUT", body: { ...biz, address: "서울시 테스트구 1", bizNumber: "" } });
  ok(r.status === 200, "사업자 정보 저장", r.data);
  r = await pub("/settings/public");
  ok(r.data.business.address === "서울시 테스트구 1" && r.data.business.bizNumber === "", "공개 설정에 즉시 반영 (빈 값은 빈 값)");
  r = await admin("/admin/settings/business", { method: "PUT", body: { ...biz, email: "not-mail" } });
  ok(r.status === 400, "이메일 형식 오류 → 400", r.status);
  const opts = (await admin("/admin/settings")).data.form_options;
  r = await admin("/admin/settings/form_options", { method: "PUT", body: { products: [...opts.products, "TV단독"], carriers: opts.carriers } });
  ok(r.status === 200, "관심 상품 추가 저장");
  r = await pub("/public/leads", { method: "POST", body: { name: "옵션테스트", phone: "010-5555-" + String(Date.now()).slice(-4), products: ["TV단독"], carrier: opts.carriers[0], consent: true } });
  ok(r.status === 201, "새 선택지로 접수 가능", r.data);
  const leadId = (await pool.query("SELECT id FROM leads WHERE name = '옵션테스트' ORDER BY id DESC LIMIT 1")).rows[0]?.id;
  r = await admin("/admin/settings/form_options", { method: "PUT", body: opts });
  r = await pub("/public/leads", { method: "POST", body: { name: "옵션테스트2", phone: "010-5556-" + String(Date.now()).slice(-4), products: ["TV단독"], carrier: opts.carriers[0], consent: true } });
  ok(r.status === 400, "지운 선택지로는 접수 불가", r.status);
  const kept = (await pool.query("SELECT products FROM leads WHERE id = $1", [leadId])).rows[0];
  ok(kept?.products?.includes("TV단독"), "선택지를 지워도 기존 DB 값은 그대로");
  await pool.query("DELETE FROM leads WHERE name LIKE '옵션테스트%'");

  console.log("9) 상태값");
  r = await admin("/admin/settings/statuses", { method: "POST", body: { name: "테스트상태" } });
  const sid = r.data?.id;
  ok(r.status === 201, "상태 추가");
  r = await admin(`/admin/settings/statuses/${sid}`, { method: "DELETE" });
  ok(r.status === 200, "안 쓴 상태 삭제 가능");
  const used = (await pool.query("SELECT s.id FROM lead_statuses s WHERE EXISTS (SELECT 1 FROM leads l WHERE l.status_id = s.id) AND NOT s.is_default LIMIT 1")).rows[0]
    || (await pool.query("SELECT s.id FROM lead_statuses s WHERE EXISTS (SELECT 1 FROM leads l WHERE l.status_id = s.id) LIMIT 1")).rows[0];
  r = await admin(`/admin/settings/statuses/${used.id}`, { method: "DELETE" });
  ok(r.status === 409 || r.status === 400, "사용 중인 상태 삭제 거부", r.data);

  console.log("10) 권한 · 기록");
  const loginId = "ctest" + String(Date.now()).slice(-6);
  await admin("/admin/users", { method: "POST", body: { loginId, name: "콘텐츠테스트직원", password: "Staff1234!", role: "staff" } });
  const staff = client();
  await staff("/auth/login", { method: "POST", body: { loginId, password: "Staff1234!" } });
  const checks = [
    ["GET", "/admin/content/plans"], ["PUT", "/admin/content/plans/draft"], ["POST", "/admin/content/plans/publish"],
    ["GET", "/admin/content/preview"], ["GET", "/admin/settings"], ["PUT", "/admin/settings/business"],
    ["GET", "/admin/popups"], ["POST", "/admin/media"], ["GET", "/admin/settings/statuses"],
  ];
  for (const [method, path] of checks) {
    r = await staff(path, { method, body: method === "GET" ? undefined : {} });
    ok(r.status === 403, `직원 ${method} ${path} → 403`, r.status);
  }
  await pool.query("DELETE FROM access_logs WHERE user_id IN (SELECT id FROM users WHERE login_id = $1)", [loginId]);
  await pool.query("DELETE FROM users WHERE login_id = $1", [loginId]);
  const logs = (await pool.query("SELECT action FROM access_logs WHERE created_at > now() - interval '5 minutes'")).rows.map((x) => x.action);
  ok(["content.publish", "content.revert", "settings.update", "popup.create", "media.upload"].every((a) => logs.includes(a)), "게시·되돌리기·설정 변경·팝업·업로드가 access_logs 에 기록", [...new Set(logs)]);
  r = await pub("/plans");
  ok(/no-cache/.test(r.headers.get("cache-control")) && r.headers.get("etag"), "공개 API: no-cache + ETag (브라우저는 매번 확인, 바뀐 게 없으면 304)");
} finally {
  // 원래대로 복구 — API 로 다시 게시/저장해야 서버 메모리 캐시도 함께 갱신됨
  for (const b of backup) {
    await admin(`/admin/content/${b.key}/publish`, { method: "POST", body: { data: b.published } });
    await pool.query("UPDATE site_content SET draft = $2 WHERE key = $1", [b.key, b.draft]);
  }
  for (const s of settingsBackup.filter((x) => !x.key.startsWith("_"))) await admin(`/admin/settings/${s.key}`, { method: "PUT", body: s.value });
  await pool.query("DELETE FROM content_versions WHERE id > $1", [verBefore]);
  await pool.query("DELETE FROM popups WHERE id > $1", [popupBefore]);
  await pool.end();
  console.log("\n(테스트 데이터 정리 완료 — API 서버 캐시는 재시작 또는 다음 게시 때 갱신)");
}
console.log(`\n결과: ${pass} 통과, ${fail} 실패`);
process.exit(fail ? 1 : 0);
