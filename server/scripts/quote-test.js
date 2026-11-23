// 추가 지시서 2 (브랜드 컬러 · 간편 견적 · 빠른 상담 메뉴) 완료 기준 자동 점검
// 로컬/스테이징 전용 — 테스트 접수(010-5550-xxxx)를 만들었다가 지우고, 콘텐츠·설정을 원래대로 되돌린다.
// 사용: API=http://localhost:4000 ADMIN_ID=admin ADMIN_PW=... node --env-file-if-exists=.env scripts/quote-test.js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../src/db.js";

const API = process.env.API || "http://localhost:4000";
const CLIENT_SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "client", "src");
let pass = 0, fail = 0;
const ok = (cond, msg, extra) => {
  if (cond) { pass++; console.log("  ✔", msg); }
  else { fail++; console.log("  ✘", msg, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ""); }
};
function client() {
  let cookie = "";
  return async (p, { method = "GET", body } = {}) => {
    const headers = { "X-Forwarded-For": `10.8.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` };
    if (cookie) headers.Cookie = cookie;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const res = await fetch(API + "/api" + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const sc = res.headers.get("set-cookie");
    if (sc) cookie = sc.split(";")[0];
    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("json") ? await res.json() : Buffer.from(await res.arrayBuffer());
    return { status: res.status, data };
  };
}
const clone = (v) => JSON.parse(JSON.stringify(v));

// ───────── 색 검사: 빨강(345~15°)·주황(15~45°)·마젠타(290~345°) ─────────
function hsl(hex) {
  let [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
const carrierLike = (hex) => {
  const [h, s, l] = hsl(hex);
  return s >= 0.3 && l >= 0.15 && l <= 0.9 && (h >= 290 || h <= 45);
};
const ERROR_ONLY = new Set(["C0392B"]); // 에러 문구 전용 (지시서 예외)

const admin = client();
const pub = client();
let r = await admin("/auth/login", { method: "POST", body: { loginId: process.env.ADMIN_ID, password: process.env.ADMIN_PW } });
if (r.status !== 200) throw new Error("관리자 로그인 실패 — ADMIN_ID / ADMIN_PW 확인");

const backup = (await pool.query("SELECT key, draft, published FROM site_content")).rows;
const settingsBackup = (await pool.query("SELECT key, value FROM site_settings")).rows;
const verBefore = (await pool.query("SELECT max(id) AS m FROM content_versions")).rows[0].m || 0;
const PHONE = (n) => `0105550${String(n).padStart(4, "0")}`;
let staffLogin = null;

try {
  console.log("1) 사이트 전체 색 — 통신사 고유색 계열 없음");
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  const found = [];
  for (const f of walk(CLIENT_SRC).filter((x) => /\.(css|jsx?)$/.test(x))) {
    const src = fs.readFileSync(f, "utf8");
    for (const m of src.matchAll(/#([0-9a-fA-F]{6})\b/g)) {
      if (!ERROR_ONLY.has(m[1].toUpperCase()) && carrierLike(m[1])) found.push(`${path.relative(CLIENT_SRC, f)} #${m[1]}`);
    }
    for (const m of src.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)) {
      const hex = [m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, "0")).join("");
      if (carrierLike(hex)) found.push(`${path.relative(CLIENT_SRC, f)} rgb(${m[1]},${m[2]},${m[3]})`);
    }
  }
  ok(!found.length, "client/src 에 빨강·주황·마젠타 계열 색 없음 (에러색 #C0392B 제외)", found);
  r = await pub("/plans");
  ok(r.data.carriers.every((c) => !("color" in c)), "요금표 데이터에 통신사별 색 없음", r.data.carriers.map((c) => c.color));
  r = await pub("/settings/public");
  ok(/^#[0-9A-Fa-f]{6}$/.test(r.data.brand?.color) && !carrierLike(r.data.brand.color.slice(1)), "브랜드 기본색이 통신사색 범위 밖", r.data.brand);

  console.log("2) 속도 분류 · 인터넷 단독 요금");
  const plans = (await admin("/admin/content/plans")).data.published;
  const sky = plans.carriers.find((c) => c.id === "skylife");
  const skySpeeds = [...new Set(sky.priceTable.rows.map((x) => x.speed).filter(Boolean))];
  ok(skySpeeds.join() === "200M,500M", "스카이라이프에는 200M·500M 만 있음", skySpeeds);
  const draft = clone(plans);
  const kt = draft.carriers.find((c) => c.id === "kt");
  kt.priceTable.rows.find((x) => x.speed === "500M").internetOnly = 33000;
  r = await admin("/admin/content/plans/publish", { method: "POST", body: { data: draft } });
  ok(r.status === 200, "인터넷 단독 요금 입력 후 게시", r.data);
  const bad = clone(draft);
  bad.carriers[0].priceTable.rows[0].speed = "300M";
  r = await admin("/admin/content/plans/publish", { method: "POST", body: { data: bad } });
  ok(r.status === 400, "정해진 값이 아닌 속도 분류는 거부", r.status);

  console.log("3) 간편 견적 접수 — 조건 저장, 서버가 요금 다시 계산");
  const lead = (n, body) => pub("/public/leads", { method: "POST", body: { name: `견적테스트${n}`, phone: PHONE(n), consent: true, ...body } });
  r = await lead(1, { inquiryType: "quote", quote: { carrier: "kt", service: "internet", speed: "500M", mobileBundle: false } });
  ok(r.status === 201, "인터넷 단독 견적 접수 201", r.data);
  r = await lead(2, { inquiryType: "quote", quote: { carrier: "sk", service: "internet_tv", speed: "500M", mobileBundle: true } });
  ok(r.status === 201, "인터넷+TV 견적 접수 201", r.data);
  r = await lead(3, { inquiryType: "quote", quote: { carrier: "lg", service: "internet", speed: "1G", mobileBundle: false } });
  ok(r.status === 201, "단독 요금 없는 조합도 접수 (상담 시 안내)", r.data);
  r = await lead(4, { inquiryType: "quote", quote: { carrier: "skylife", service: "internet_tv", speed: "1G", mobileBundle: false } });
  ok(r.status === 400, "그 통신사에 없는 속도(스카이라이프 1G) 거부", r.data);
  r = await lead(5, { inquiryType: "quote", quote: { carrier: "nope", service: "internet", speed: "500M", mobileBundle: false } });
  ok(r.status === 400, "없는 통신사 거부", r.data);
  const rows = Object.fromEntries((await pool.query(
    `SELECT phone, inquiry_type, carrier, quote_carrier, quote_service, quote_speed, quote_mobile_bundle, quote_estimated_price
       FROM leads WHERE phone LIKE '0105550%'`)).rows.map((x) => [x.phone, x]));
  const a = rows[PHONE(1)], b = rows[PHONE(2)], c = rows[PHONE(3)];
  ok(a?.inquiry_type === "quote" && a.quote_estimated_price === 33000 && a.quote_service === "인터넷", "KT 인터넷 500M → 단독 요금 33,000원 저장", a);
  const skMin = Math.min(...plans.carriers.find((x) => x.id === "sk").priceTable.rows.filter((x) => x.speed === "500M").flatMap((x) => x.prices));
  ok(b?.quote_carrier === "SK브로드밴드" && b.quote_speed === "500M" && b.quote_mobile_bundle === true && b.quote_estimated_price === skMin,
    `SK 인터넷+TV 500M → TV 상품 중 최저 ${skMin}원, 휴대폰 결합 저장`, b);
  ok(b?.carrier === "SK", "견적 통신사가 '희망 통신사'에도 들어감 (필터용)", b?.carrier);
  ok(c && c.quote_estimated_price === null, "요금 데이터 없으면 예상 요금 비움 (상담 시 안내)", c);

  console.log("4) 빠른 메뉴 접수 유형 · 폼 접수");
  for (const [n, t] of [[11, "subsidy"], [12, "consult"], [13, "recommend"]]) {
    r = await lead(n, { inquiryType: t });
    ok(r.status === 201, `${t} — 이름·연락처만으로 접수`, r.data);
  }
  r = await lead(14, { products: ["인터넷"], carrier: "KT" });
  ok(r.status === 201, "기존 상담 폼 접수 (유형 미지정 → form)", r.data);
  r = await lead(15, { inquiryType: "form" });
  ok(r.status === 400, "상담 폼은 관심상품·통신사 필수 유지", r.data);
  r = await lead(16, { inquiryType: "consult", website: "http://spam" });
  ok(r.status === 201 && !(await pool.query("SELECT 1 FROM leads WHERE phone = $1", [PHONE(16)])).rows.length, "모달 접수에도 honeypot 적용 (저장 안 함)");
  r = await lead(17, { inquiryType: "subsidy", quote: { carrier: "kt", service: "internet", speed: "500M", mobileBundle: false } });
  ok(r.status === 400, "견적 유형이 아닌데 견적 조건이 오면 거부", r.status);
  const types = Object.fromEntries((await pool.query("SELECT phone, inquiry_type FROM leads WHERE phone LIKE '0105550%'")).rows.map((x) => [x.phone, x.inquiry_type]));
  ok(types[PHONE(11)] === "subsidy" && types[PHONE(12)] === "consult" && types[PHONE(13)] === "recommend" && types[PHONE(14)] === "form", "접수 유형이 DB 에 구분 저장", types);

  console.log("5) 관리자 목록 · 필터 · 엑셀 · 직원 화면");
  r = await admin("/admin/leads?inquiryType=subsidy&q=견적테스트&pageSize=200");
  ok(r.data.items.length === 1 && r.data.items[0].inquiry_type === "subsidy", "접수 유형 필터", r.data.items?.map((x) => x.inquiry_type));
  r = await admin("/admin/leads?inquiryType=quote&q=견적테스트&pageSize=200");
  ok(r.data.items.length === 3 && r.data.items.every((x) => x.quote_carrier), "간편 견적 필터 + 견적 조건 포함", r.data.items?.length);
  r = await admin("/admin/leads/export?q=견적테스트");
  const xlsx = r.data;
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(xlsx);
  const ws = wb.worksheets[0];
  const head = ws.getRow(1).values;
  const qi = head.indexOf("견적조건");
  const cells = [];
  ws.eachRow((row, i) => i > 1 && cells.push(row.getCell(qi).value));
  ok(qi > 0 && cells.includes("SK브로드밴드 · 인터넷+TV · 500M · 휴대폰 결합"), "엑셀에 접수유형·견적조건 열", { qi, cells });

  staffLogin = "qtest" + String(Date.now()).slice(-6);
  const su = await admin("/admin/users", { method: "POST", body: { loginId: staffLogin, name: "견적테스트직원", password: "Staff1234!", role: "staff" } });
  const staffId = su.data.id ?? su.data.user?.id;
  const bid = (await pool.query("SELECT id FROM leads WHERE phone = $1", [PHONE(2)])).rows[0].id;
  r = await admin("/admin/leads/assign", { method: "POST", body: { ids: [bid], assigneeId: staffId } });
  const staff = client();
  await staff("/auth/login", { method: "POST", body: { loginId: staffLogin, password: "Staff1234!" } });
  r = await staff("/staff/leads");
  const mine = (r.data.items || []).find((x) => x.id === bid);
  ok(mine?.quote_carrier === "SK브로드밴드" && mine.quote_speed === "500M" && !mine.phone, "직원 화면에 견적 조건 (연락처는 계속 가림)", mine);

  console.log("6) 관리자에서 빠른 메뉴 · 창 문구 · 견적 문구 · 브랜드 색 변경");
  const consult0 = (await admin("/admin/settings")).data.consult;
  const consult1 = clone(consult0);
  consult1.menu = [...consult1.menu].reverse().map((m) => (m.type === "subsidy" ? { ...m, label: "지원 안내", enabled: false } : m));
  consult1.modals.consult.title = "테스트 제목";
  r = await admin("/admin/settings/consult", { method: "PUT", body: consult1 });
  ok(r.status === 200, "빠른 메뉴 저장", r.data);
  r = await pub("/settings/public");
  ok(r.data.consult.menu[0].type === consult0.menu.at(-1).type && r.data.consult.menu.find((m) => m.type === "subsidy").enabled === false
    && r.data.consult.modals.consult.title === "테스트 제목", "순서·켜기/끄기·창 제목이 공개 설정에 바로 반영", r.data.consult);
  const dup = clone(consult0);
  dup.menu[1] = { ...dup.menu[0] };
  r = await admin("/admin/settings/consult", { method: "PUT", body: dup });
  ok(r.status === 400, "같은 버튼 두 번 → 거부", r.status);
  r = await admin("/admin/settings/brand", { method: "PUT", body: { color: "#2563EB" } });
  ok(r.status === 200 && (await pub("/settings/public")).data.brand.color === "#2563EB", "브랜드 색 변경 즉시 반영");
  const q0 = (await admin("/admin/content/quote")).data.published;
  r = await admin("/admin/content/quote/publish", { method: "POST", body: { data: { ...q0, ctaLabel: "" } } });
  ok(r.status === 400 && r.data.issues?.length, "견적 버튼 문구 비우면 반영 거부", r.data);
  r = await admin("/admin/content/quote/publish", { method: "POST", body: { data: { ...q0, usimNotice: "테스트 유심 안내" } } });
  ok(r.status === 200 && (await pub("/site")).data.quote.usimNotice === "테스트 유심 안내", "견적 위젯 문구 반영 (버전 관리)");

  console.log("7) 권한");
  for (const [method, p] of [["PUT", "/admin/settings/consult"], ["PUT", "/admin/settings/brand"], ["POST", "/admin/content/quote/publish"]]) {
    r = await staff(p, { method, body: {} });
    ok(r.status === 403, `직원 ${method} ${p} → 403`, r.status);
    r = await pub(p, { method, body: {} });
    ok(r.status === 401, `비로그인 ${method} ${p} → 401`, r.status);
  }
} finally {
  for (const b of backup) {
    await admin(`/admin/content/${b.key}/publish`, { method: "POST", body: { data: b.published } });
    await pool.query("UPDATE site_content SET draft = $2 WHERE key = $1", [b.key, b.draft]);
  }
  for (const s of settingsBackup.filter((x) => !x.key.startsWith("_"))) await admin(`/admin/settings/${s.key}`, { method: "PUT", body: s.value });
  await pool.query("DELETE FROM content_versions WHERE id > $1", [verBefore]);
  await pool.query("DELETE FROM leads WHERE phone LIKE '0105550%'");
  if (staffLogin) {
    await pool.query("DELETE FROM access_logs WHERE user_id IN (SELECT id FROM users WHERE login_id = $1)", [staffLogin]);
    await pool.query("DELETE FROM users WHERE login_id = $1", [staffLogin]);
  }
  await pool.end();
  console.log("\n(테스트 데이터 정리 완료)");
}
console.log(`\n결과: ${pass} 통과, ${fail} 실패`);
process.exit(fail ? 1 : 0);
