// 완료 기준 자동 점검 스크립트 (로컬/스테이징 전용 — 테스트 데이터를 생성한다)
// 사용: API=http://localhost:4000 ADMIN_ID=admin ADMIN_PW=... node --env-file-if-exists=.env scripts/api-test.js
import ExcelJS from "exceljs";
import { pool } from "../src/db.js";

const API = process.env.API || "http://localhost:4000";
const run = Date.now().toString().slice(-6);
let pass = 0, fail = 0;
const ok = (cond, msg, extra) => {
  if (cond) { pass++; console.log("  ✔", msg); }
  else { fail++; console.log("  ✘", msg, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ""); }
};

function client(ip) {
  let cookie = "";
  const call = async (path, { method = "GET", body, form, raw } = {}) => {
    const headers = { "X-Forwarded-For": ip };
    if (cookie) headers.Cookie = cookie;
    let payload;
    if (form) payload = form;
    else if (body !== undefined) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
    const res = await fetch(API + "/api" + path, { method, headers, body: payload });
    const sc = res.headers.get("set-cookie");
    if (sc) cookie = sc.split(";")[0];
    if (raw) return { status: res.status, buf: Buffer.from(await res.arrayBuffer()) };
    const data = res.headers.get("content-type")?.includes("json") ? await res.json() : null;
    return { status: res.status, data };
  };
  return call;
}
const rnd = () => "010" + String(Math.floor(Math.random() * 1e8)).padStart(8, "0");

console.log("1) 고객 접수");
{
  const ip = `10.0.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
  const c = client(ip);
  const base = { name: "테스트고객", phone: hyphen(rnd()), products: ["인터넷", "휴대폰"], carrier: "KT", callTime: "오후", message: "문의" };
  const before = await count("leads");
  let r = await c("/public/leads", { method: "POST", body: { ...base, consent: false } });
  ok(r.status === 400, "동의 없이 제출 → 400", r);
  r = await c("/public/leads", { method: "POST", body: { ...base, consent: true, website: "http://spam" } });
  ok(r.status === 201 && (await count("leads")) === before, "honeypot 채우면 저장 안 됨(성공 위장)");
  r = await c("/public/leads", { method: "POST", body: { ...base, consent: true, utmSource: "naver", utmMedium: "cpc", utmCampaign: `t${run}`, referrer: "https://search.naver.com/" } });
  ok(r.status === 201, "정상 접수 → 201", r);
  const { rows } = await pool.query("SELECT * FROM leads ORDER BY id DESC LIMIT 1");
  ok(rows[0].utm_campaign === `t${run}` && rows[0].source === "web" && rows[0].assignee_id === null && rows[0].consent_at && rows[0].ip === ip,
    "DB 저장 + 유입경로/출처/미배정/동의시각/IP 저장", rows[0]);
  ok(/^\d+$/.test(rows[0].phone), "연락처 숫자만 저장");
  r = await c("/public/leads", { method: "POST", body: { ...base, consent: true } });
  ok(r.status === 429, "같은 IP 1분 4번째 → 429", r.status);
  const other = client(ip + "9");
  r = await other("/public/leads", { method: "POST", body: { ...base, phone: "010-12", consent: true } });
  ok(r.status === 400, "잘못된 연락처 → 400");
}

console.log("2) 로그인/권한");
const admin = client("10.1.0.1");
let r = await admin("/auth/login", { method: "POST", body: { loginId: process.env.ADMIN_ID || "admin", password: process.env.ADMIN_PW } });
ok(r.status === 200 && r.data.user.role === "admin", "관리자 로그인", r);
const mk = async (loginId, quota) => (await admin("/admin/users", { method: "POST", body: { loginId, name: loginId, password: "Staff1234!", role: "staff", dailyQuota: quota } })).data.user;
// 기존 테스트 직원 할당량 0 으로 (반복 실행 대비)
await pool.query("UPDATE users SET daily_quota = 0 WHERE login_id LIKE 'staff%'");
const A = await mk(`staffa${run}`, 2);
const B = await mk(`staffb${run}`, 3);
ok(A && B, "직원 A(할당 2), B(할당 3) 생성");
const lockC = client("10.1.0.9");
for (let i = 0; i < 5; i++) r = await lockC("/auth/login", { method: "POST", body: { loginId: A.login_id, password: "wrong" } });
ok(r.status === 423, "5회 실패 → 423 잠금", r);
r = await lockC("/auth/login", { method: "POST", body: { loginId: A.login_id, password: "Staff1234!" } });
ok(r.status === 423, "잠금 중에는 올바른 비밀번호도 거부");
await admin(`/admin/users/${A.id}`, { method: "PATCH", body: { unlock: true } });
const sa = client("10.2.0.1"), sb = client("10.2.0.2");
ok((await sa("/auth/login", { method: "POST", body: { loginId: A.login_id, password: "Staff1234!" } })).status === 200, "관리자 잠금 해제 후 A 로그인");
ok((await sb("/auth/login", { method: "POST", body: { loginId: B.login_id, password: "Staff1234!" } })).status === 200, "B 로그인");
ok((await sa("/admin/leads")).status === 403, "직원이 관리자 API 호출 → 403");
ok((await client("10.9.9.9")("/staff/leads")).status === 401, "비로그인 직원 API → 401");

console.log("3) 분배");
await pool.query("UPDATE leads SET assignee_id = NULL, assigned_at = NULL WHERE assignee_id IS NULL");
const st = (await pool.query("SELECT id FROM lead_statuses WHERE is_default")).rows[0].id;
for (let i = 0; i < 8; i++) {
  await pool.query("INSERT INTO leads (name, phone, products, source, status_id, created_at) VALUES ($1,$2,'{인터넷}','web',$3, now() - ($4 || ' minutes')::interval)", [`분배${i}`, rnd(), st, 100 - i]);
}
r = await admin("/admin/leads/distribute", { method: "POST" });
const per = Object.fromEntries(r.data.perStaff.map((p) => [p.id, p.assigned]));
ok(per[A.id] === 2 && per[B.id] === 3, "분배: A 2건, B 3건 (할당량 이내)", r.data);
r = await admin("/admin/leads/distribute", { method: "POST" });
ok(r.data.assigned === 0, "다시 실행해도 할당량 초과 배정 없음", r.data);

console.log("4) 직원 접근 제어/마스킹");
const la = (await sa("/staff/leads")).data.items;
const lb = (await sb("/staff/leads")).data.items;
ok(la.length === 2 && la.every((l) => l.assignee_id === A.id), "A 목록에는 A 의 DB 만", la.length);
ok(la.every((l) => !("phone" in l) && /^010-\*\*\*\*-\d{4}$/.test(l.phone_masked)), "직원 목록 연락처 마스킹(원본 필드 없음)", la[0]);
r = await sa(`/staff/leads/${lb[0].id}`);
ok(r.status === 403, "A 가 B 의 DB 상세 요청 → 403", r.status);
ok((await sa(`/staff/leads/${lb[0].id}/phone`, { method: "POST" })).status === 403, "A 가 B 의 원본 번호 요청 → 403");
ok((await sa(`/staff/leads/${lb[0].id}/status`, { method: "PATCH", body: { statusId: st + 2 } })).status === 403, "A 가 B 의 상태 변경 → 403");
ok((await sa(`/staff/leads/${lb[0].id}/notes`, { method: "POST", body: { content: "x" } })).status === 403, "A 가 B 의 메모 추가 → 403");
r = await sa(`/staff/leads/${la[0].id}/phone`, { method: "POST" });
ok(r.status === 200 && /^01\d{8,9}$/.test(r.data.phone), "본인 DB 원본 번호 1건 조회");
const log = await pool.query("SELECT 1 FROM access_logs WHERE user_id = $1 AND action = 'staff_reveal_phone' AND target_id = $2", [A.id, String(la[0].id)]);
ok(log.rowCount === 1, "원본 번호 조회 access_logs 기록");
const statuses = (await sa("/meta/statuses")).data.statuses;
const opened = statuses.find((s) => s.name === "개통완료");
r = await sa(`/staff/leads/${la[0].id}/status`, { method: "PATCH", body: { statusId: opened.id } });
ok(r.status === 200 && r.data.lead.status_name === "개통완료", "본인 DB 상태 변경");
r = await sa(`/staff/leads/${la[0].id}/notes`, { method: "POST", body: { content: "1차 통화 완료" } });
ok(r.status === 201, "메모 추가");
r = await sa(`/staff/leads/${la[0].id}`);
ok(r.data.notes[0].user_name === A.name && r.data.history.length === 1, "메모 작성자/상태 이력 기록");
r = await sa("/staff/leads", { method: "POST", body: { name: "전화고객", phone: "010-5555-" + run.slice(0, 4), products: ["휴대폰"], carrier: "SK", consent: true, memo: "지인 소개" } });
ok(r.status === 201 && r.data.lead.source === "staff" && r.data.lead.assignee_id === A.id && r.data.lead.created_by === A.id, "직원 직접 접수 → 본인 배정, 출처 staff", r.data);

console.log("5) 관리자 목록/중복/엑셀");
const dupPhone = rnd();
await pool.query("INSERT INTO leads (name, phone, source, status_id) VALUES ('중복1',$1,'web',$2),('중복2',$1,'web',$2)", [dupPhone, st]);
r = await admin(`/admin/leads?q=${dupPhone}`);
ok(r.data.items.length === 2 && r.data.items.every((l) => l.is_duplicate && l.phone === dupPhone), "관리자 원본 연락처 + 중복 배지 데이터");
r = await admin(`/admin/leads?status=${opened.id}&assignee=${A.id}`);
const listTotal = r.data.total;
const x = await admin(`/admin/leads/export?status=${opened.id}&assignee=${A.id}`, { raw: true });
const wb = new ExcelJS.Workbook();
await wb.xlsx.load(x.buf);
ok(x.status === 200 && wb.worksheets[0].rowCount - 1 === listTotal && listTotal === 1, "엑셀 다운로드 행 수 = 필터 목록 건수", { listTotal, rows: wb.worksheets[0].rowCount - 1 });
const allTotal = (await admin("/admin/leads?pageSize=1")).data.total;
const x2 = await admin("/admin/leads/export", { raw: true });
const wb2 = new ExcelJS.Workbook(); await wb2.xlsx.load(x2.buf);
ok(wb2.worksheets[0].rowCount - 1 === allTotal, "필터 없음 다운로드 = 전체 건수");
ok((await pool.query("SELECT 1 FROM access_logs WHERE action='excel_download'")).rowCount >= 2, "엑셀 다운로드 access_logs 기록");

console.log("6) 엑셀 업로드");
const up = new ExcelJS.Workbook();
const ws = up.addWorksheet("s");
ws.addRow(["이름", "연락처", "관심상품", "희망통신사", "메모"]);
const p1 = rnd(), p2 = rnd();
ws.addRow(["정상1", p1, "인터넷, 휴대폰", "KT", "메모1"]);
ws.addRow(["숫자형", Number(p2), "인터넷+TV", "LGU+", ""]); // 앞자리 0 빠진 숫자
ws.addRow(["파일중복", p1, "", "", ""]);
ws.addRow(["DB중복", dupPhone, "", "SK", ""]);
ws.addRow(["번호오류", "02-123-4567", "", "", ""]);
ws.addRow(["", rnd(), "", "", ""]);
ws.addRow(["상품오류", rnd(), "위성방송", "KT", ""]);
ws.addRow(["통신사오류", rnd(), "", "알뜰폰", ""]);
const form = new FormData();
form.append("file", new Blob([await up.xlsx.writeBuffer()]), "test.xlsx");
r = await admin("/admin/upload/preview", { method: "POST", form });
const s = r.data?.summary;
ok(s && s.total === 8 && s.new === 2 && s.duplicate === 2 && s.error === 4, "미리보기 총8/신규2/중복2/오류4", r.data?.summary || r);
ok(r.data.errors.map((e) => e.row).join() === "6,7,8,9", "오류 행 번호 정확", r.data.errors.map((e) => [e.row, e.reason]));
ok(r.data.duplicates.some((d) => d.reason.includes("파일 내")) && r.data.duplicates.some((d) => d.reason.includes("기존 DB")), "중복 사유(파일 내/기존 DB) 구분");
const before = await count("leads");
const conf = await admin(`/admin/upload/${r.data.batchId}/confirm`, { method: "POST", body: {} });
ok(conf.data.inserted === 2 && (await count("leads")) === before + 2, "확정 시 신규 2건만 저장", conf.data);
ok((await admin(`/admin/upload/${r.data.batchId}/confirm`, { method: "POST", body: {} })).status === 409, "같은 배치 재확정 → 409");
const upl = await pool.query("SELECT source, upload_batch_id, phone FROM leads WHERE upload_batch_id = $1", [r.data.batchId]);
ok(upl.rows.every((l) => l.source === "upload") && upl.rows.some((l) => l.phone === p2), "출처 upload + 배치ID + 숫자형 번호 0 보정");

console.log("7) 수동 일괄 배정/통계");
const un = (await admin("/admin/leads?unassigned=1&pageSize=2")).data.items.map((l) => l.id);
r = await admin("/admin/leads/assign", { method: "POST", body: { ids: un, assigneeId: B.id } });
ok(r.data.updated === un.length, "일괄 배정");
r = await admin("/admin/stats");
ok(r.status === 200 && r.data.byStaff.some((x) => x.id === A.id && x.opened_today === 1), "통계: A 오늘 개통완료 1", r.data.byStaff?.find((x) => x.id === A.id));

console.log(`\n결과: ${pass} 통과 / ${fail} 실패`);
await pool.end();
process.exit(fail ? 1 : 0);

async function count(t) { return (await pool.query(`SELECT count(*)::int n FROM ${t}`)).rows[0].n; }
function hyphen(d) { return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`; }
