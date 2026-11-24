// 고객센터 질문/답변 완료 기준 자동 점검
// 로컬/스테이징 전용 — 테스트 글·접수(010-5551-xxxx)·차단 IP·임시 직원을 만들었다가 지우고, 설정을 되돌린다.
// 사용: API=http://localhost:4000 ADMIN_ID=admin ADMIN_PW=... node --env-file-if-exists=.env scripts/qna-test.js
import bcrypt from "bcrypt";
import { pool } from "../src/db.js";

const API = process.env.API || "http://localhost:4000";
let pass = 0, fail = 0;
const ok = (cond, msg, extra) => {
  if (cond) { pass++; console.log("  ✔", msg); }
  else { fail++; console.log("  ✘", msg, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ""); }
};
const rnd = () => Math.floor(Math.random() * 250);
const newIp = () => `10.8.${rnd()}.${rnd()}`;
/** ip 를 고정한 클라이언트 (쿠키 유지) */
function client(ip = newIp()) {
  const jar = new Map(); // 로그인 쿠키 · 조회수 쿠키를 함께 유지
  const fn = async (p, { method = "GET", body } = {}) => {
    const headers = { "X-Forwarded-For": fn.ip };
    if (jar.size) headers.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const res = await fetch(API + "/api" + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    for (const sc of res.headers.getSetCookie?.() || []) {
      const [kv] = sc.split(";");
      const i = kv.indexOf("=");
      jar.set(kv.slice(0, i), kv.slice(i + 1));
    }
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data, text };
  };
  fn.ip = ip;
  return fn;
}

const admin = client();
let r = await admin("/auth/login", { method: "POST", body: { loginId: process.env.ADMIN_ID, password: process.env.ADMIN_PW } });
if (r.status !== 200) throw new Error("관리자 로그인 실패 — ADMIN_ID / ADMIN_PW 확인");

const maxPost = (await pool.query("SELECT COALESCE(max(id), 0) AS m FROM qna_posts")).rows[0].m;
const qnaSetting = (await pool.query("SELECT value FROM site_settings WHERE key = 'qna'")).rows[0]?.value ?? null;
const PHONE = (n) => `0105551${String(n).padStart(4, "0")}`;
const STAFF_LOGIN = `qna_staff_${Date.now().toString(36)}`;
const blockedIps = [];
let staffId = null;

const write = (c, extra = {}) => c("/public/qna", { method: "POST", body: { name: "홍길동", password: "pw1234", title: "인터넷 약정 문의", content: "약정이 남았는데 바꿀 수 있나요?", isSecret: true, consent: true, ...extra } });
const setQna = (v) => admin("/admin/settings/qna", { method: "PUT", body: { bannedWords: [], staffAnswer: false, ...v } });

try {
  console.log("1) 메뉴 — 고객센터 드롭다운");
  const menu = (await client()("/site")).data.menu.items;
  const cs = menu.find((m) => m.label === "고객센터");
  ok(cs && cs.children.map((c) => c.to).join() === "/support,/support/faq,/support/qna" && cs.children.every((c) => c.enabled),
    "고객센터 하위: 고객센터 안내 · 자주 묻는 질문 · 질문/답변", cs);

  console.log("2) 로그인 없이 작성 · 목록 · 마스킹");
  const u1 = client();
  r = await write(u1, { phone: "010-5551-0001", title: "연락 주세요 010-1234-5678", content: "제 번호는 01098765432 입니다. 비밀 내용 XYZ-SECRET" });
  const secretId = r.data?.id;
  ok(r.status === 201 && r.data.status === "waiting" && secretId, "비로그인 비밀글 작성 → 답변대기", r.data);
  r = await write(u1, { name: "김철수", isSecret: false, title: "공개 질문입니다", content: "공개 본문 OPEN-BODY" });
  const openId = r.data?.id;
  ok(r.status === 201 && openId, "공개글 작성");

  const pub = client();
  let list = (await pub("/public/qna")).data;
  const sItem = list.items.find((x) => x.id === secretId);
  ok(sItem && sItem.isSecret && sItem.status === "waiting" && sItem.isNew && sItem.answers === 0, "목록: 비밀글 제목·답변대기·NEW 표시", sItem);
  ok(sItem?.author === "홍*동" && list.items.find((x) => x.id === openId)?.author === "김*수", "작성자 이름 마스킹 (홍*동)");
  ok(sItem?.title === "연락 주세요 010-****-5678", "제목 속 전화번호 마스킹", sItem?.title);
  const listText = JSON.stringify(list);
  ok(!listText.includes("XYZ-SECRET") && !listText.includes("content") && !listText.includes("phone"), "목록 응답에 본문·연락처 없음");

  console.log("3) 비밀글 — 비밀번호 없이는 내용 불가 (API 직접 호출 포함)");
  r = await pub(`/public/qna/${secretId}`);
  ok(r.status === 200 && r.data.post.locked === true && r.data.post.content === undefined && typeof r.data.post.answers === "number", "비밀글 보기 → 잠김 (본문·답변 내용 없음, 답변 수만)", r.data);
  ok(!r.text.includes("XYZ-SECRET") && !r.text.includes("98765432") && !r.text.includes("55510001"), "잠긴 응답 원문에 본문·연락처 없음");
  r = await pub("/public/qna?field=content&q=XYZ-SECRET");
  ok(r.data.total === 0, "내용 검색으로 비밀글 본문 추측 불가");
  r = await pub("/public/qna?field=content&q=OPEN-BODY");
  ok(r.data.total === 1 && r.data.items[0].id === openId, "공개글은 내용 검색 가능");
  r = await pub(`/public/qna/${secretId}/unlock`, { method: "POST", body: { password: "wrong" } });
  ok(r.status === 403 && /4번 남음/.test(r.data.error), "틀린 비밀번호 → 403 (남은 횟수)", r.data);
  r = await pub(`/public/qna/${secretId}/unlock`, { method: "POST", body: { password: "pw1234" } });
  ok(r.status === 200 && r.data.post.content.includes("XYZ-SECRET") && r.data.post.content.includes("010-****-5432") && !r.text.includes("98765432"),
    "맞는 비밀번호 → 열람 (본문 전화번호는 가림)", r.data?.post?.content);
  ok(!r.text.includes("55510001") && !("phone" in r.data.post), "열람 응답에도 연락처 없음");
  r = await admin(`/public/qna/${secretId}`);
  ok(r.data.post.content?.includes("XYZ-SECRET"), "관리자는 비밀번호 없이 바로 열람");

  for (let i = 0; i < 5; i++) r = await pub(`/public/qna/${secretId}/unlock`, { method: "POST", body: { password: "nope" } });
  ok(r.status === 429, "비밀번호 5번 틀림 → 10분 잠금", r.status);
  r = await pub(`/public/qna/${secretId}/unlock`, { method: "POST", body: { password: "pw1234" } });
  ok(r.status === 429, "잠금 중에는 맞는 비밀번호도 거부");
  await pool.query("UPDATE qna_posts SET pw_locked_until = NULL, pw_fails = 0 WHERE id = $1", [secretId]);

  console.log("4) 조회수 — 같은 브라우저 하루 1회");
  const v0 = (await pool.query("SELECT view_count FROM qna_posts WHERE id = $1", [openId])).rows[0].view_count;
  const viewer = client();
  await viewer(`/public/qna/${openId}`);
  await viewer(`/public/qna/${openId}`);
  await viewer(`/public/qna/${openId}`);
  const v1 = (await pool.query("SELECT view_count FROM qna_posts WHERE id = $1", [openId])).rows[0].view_count;
  await client()(`/public/qna/${openId}`);
  const v2 = (await pool.query("SELECT view_count FROM qna_posts WHERE id = $1", [openId])).rows[0].view_count;
  ok(v1 === v0 + 1 && v2 === v1 + 1, "같은 브라우저 3번 → +1, 다른 브라우저 → +1", { v0, v1, v2 });
  list = (await pub("/public/qna?sort=views")).data;
  ok(list.items[0]?.views >= list.items.at(-1)?.views, "조회순 정렬");

  console.log("5) 수정·삭제 (비밀번호) · 관리자 답변");
  r = await pub(`/public/qna/${openId}`, { method: "PUT", body: { password: "bad!", title: "x", content: "y" } });
  ok(r.status === 403, "틀린 비밀번호로 수정 → 거부");
  r = await pub(`/public/qna/${openId}`, { method: "PUT", body: { password: "pw1234", title: "공개 질문 (수정)", content: "수정한 본문", isSecret: false } });
  ok(r.status === 200 && (await pub(`/public/qna/${openId}`)).data.post.title === "공개 질문 (수정)", "비밀번호로 수정");
  r = await admin(`/admin/qna/${openId}/answers`, { method: "POST", body: { content: "담아가넷 답변입니다." } });
  ok(r.status === 201, "관리자 답변 등록");
  list = (await pub("/public/qna")).data;
  const oItem = list.items.find((x) => x.id === openId);
  ok(oItem?.status === "answered" && oItem.answers === 1, "목록 배지 → 답변완료, [1]", oItem);
  const view = (await pub(`/public/qna/${openId}`)).data.post;
  ok(view.answers[0]?.content === "담아가넷 답변입니다." && view.canEdit === false, "글 보기에 답변 표시, 수정 불가 표시");
  r = await pub(`/public/qna/${openId}`, { method: "PUT", body: { password: "pw1234", title: "다시", content: "다시" } });
  ok(r.status === 409, "답변 달린 글 수정 → 409", r.data);
  r = await pub(`/public/qna/${openId}`, { method: "DELETE", body: { password: "pw1234" } });
  ok(r.status === 200 && (await pub(`/public/qna/${openId}`)).status === 404, "답변 달린 글도 비밀번호로 삭제 가능");

  console.log("6) 링크 → 검토중 · 차단 IP · 금지어 · 등록 제한 · honeypot");
  const u2 = client();
  r = await write(u2, { isSecret: false, title: "좋은 정보", content: "여기 보세요 https://spam.example.com" });
  const linkId = r.data?.id;
  ok(r.status === 201 && r.data.status === "review", "링크 포함 → 검토중 저장", r.data);
  ok(!(await pub("/public/qna")).data.items.some((x) => x.id === linkId) && (await pub(`/public/qna/${linkId}`)).status === 404, "검토중 글은 목록·보기 모두 비공개");
  r = await write(client(), { isSecret: false, title: "도메인만 test.co.kr", content: "본문" });
  ok(r.data.status === "review", "도메인만 있어도 검토중");
  r = await admin(`/admin/qna/${linkId}/approve`, { method: "POST" });
  ok(r.status === 200 && (await pub(`/public/qna/${linkId}`)).status === 200, "관리자 승인 → 공개");

  const blockedClient = client();
  r = await admin("/admin/qna/blocked", { method: "POST", body: { ip: blockedClient.ip, reason: "테스트" } });
  blockedIps.push(blockedClient.ip);
  r = await write(blockedClient);
  ok(r.status === 403, "차단 IP → 등록 차단", r.status);
  r = await admin(`/admin/qna/${linkId}/block-ip`, { method: "POST" });
  blockedIps.push(u2.ip);
  ok(r.status === 201 && r.data.ip === u2.ip && (await write(u2)).status === 403, "글 상세에서 작성 IP 차단");

  await setQna({ bannedWords: ["불법 대출", "도박"] });
  r = await write(client(), { content: "불법대출 문의합니다" });
  ok(r.status === 400 && /등록할 수 없는 단어/.test(r.data.error), "금지어(띄어쓰기 무시) → 등록 차단", r.data);
  r = await write(client(), { name: "도박왕" });
  ok(r.status === 400, "이름에 금지어 → 차단");
  await setQna({});

  const u3 = client();
  const codes = [];
  for (let i = 0; i < 4; i++) codes.push((await write(u3, { title: `제한 테스트 ${i}` })).status);
  ok(codes.join() === "201,201,201,429", "같은 IP 10분에 3개까지", codes);
  const n0 = (await pool.query("SELECT count(*)::int AS n FROM qna_posts")).rows[0].n;
  r = await write(client(), { website: "http://bot" });
  const n1 = (await pool.query("SELECT count(*)::int AS n FROM qna_posts")).rows[0].n;
  ok(r.status === 201 && n1 === n0, "honeypot → 성공처럼 응답하고 저장 안 함");
  r = await write(client(), { consent: false });
  ok(r.status === 400, "개인정보 동의 없으면 거부");
  r = await write(client(), { password: "123" });
  ok(r.status === 400, "비밀번호 4자 미만 거부");

  console.log("7) 공지 · 숨김");
  r = await admin("/admin/qna/notices", { method: "POST", body: { title: "질문/답변 이용 안내", content: "공지 본문" } });
  const noticeId = r.data?.id;
  list = (await pub("/public/qna")).data;
  ok(r.status === 201 && list.notices[0]?.id === noticeId && !list.items.some((x) => x.id === noticeId), "공지글 → 목록 맨 위 공지 영역");
  r = await admin(`/admin/qna/${secretId}/hide`, { method: "POST" });
  ok(r.status === 200 && (await pub(`/public/qna/${secretId}`)).status === 404, "숨김 → 비공개");
  await admin(`/admin/qna/${secretId}/unhide`, { method: "POST" });
  ok((await pub(`/public/qna/${secretId}`)).status === 200, "숨김 해제");

  console.log("8) 관리자 목록 · 접수 DB 등록");
  r = await admin("/admin/qna?status=waiting&secret=1");
  ok(r.data.items.some((x) => x.id === secretId && x.phone === PHONE(1)), "관리자 목록: 상태·비밀글 필터 + 연락처 원본");
  r = await admin(`/admin/qna?q=${PHONE(1).slice(-4)}`);
  ok(r.data.items.some((x) => x.id === secretId), "관리자 연락처 검색");
  r = await admin(`/admin/qna/${secretId}/lead`, { method: "POST" });
  const leadRow = (await pool.query("SELECT * FROM leads WHERE id = $1", [r.data?.leadId])).rows[0];
  ok(r.status === 201 && leadRow?.source === "qna" && leadRow.inquiry_type === "qna" && leadRow.phone === PHONE(1) && leadRow.name === "홍길동" && leadRow.message.includes("연락 주세요"),
    "접수 DB 등록 → 이름·연락처·제목, 출처 qna", leadRow);
  r = await admin(`/admin/qna/${secretId}/lead`, { method: "POST" });
  ok(r.status === 409, "같은 글 두 번 등록 → 409");
  r = await write(client(), { phone: PHONE(1), title: "같은 번호 두 번째" });
  r = await admin(`/admin/qna/${r.data.id}/lead`, { method: "POST" });
  ok(r.status === 201 && r.data.duplicate === true, "같은 번호가 이미 있으면 중복 표시");
  r = await admin("/admin/leads?duplicate=1&source=qna");
  ok(r.data.items?.filter((x) => x.phone === PHONE(1)).every((x) => x.is_duplicate), "DB 목록에서도 중복 배지");
  r = await admin(`/admin/qna/${linkId}/lead`, { method: "POST" });
  ok(r.status === 400, "연락처 없는 글 → 등록 불가");

  console.log("9) 직원 답변 권한 (기본 꺼짐)");
  staffId = (await pool.query("INSERT INTO users (login_id, password_hash, name, role) VALUES ($1, $2, '테스트직원', 'staff') RETURNING id",
    [STAFF_LOGIN, await bcrypt.hash("Staff1234!", 10)])).rows[0].id;
  const staff = client();
  await staff("/auth/login", { method: "POST", body: { loginId: STAFF_LOGIN, password: "Staff1234!" } });
  ok((await staff("/staff/qna/access")).data.allowed === false && (await staff("/staff/qna")).status === 403, "꺼져 있으면 직원 접근 403");
  ok((await staff(`/public/qna/${secretId}`)).data.post.locked === true, "권한 없는 직원은 비밀글도 잠김");
  await setQna({ staffAnswer: true });
  r = await staff("/staff/qna");
  const sRow = r.data.items?.find((x) => x.id === secretId);
  ok(r.status === 200 && sRow?.phone === "010-****-0001" && sRow.ip === undefined, "켜면 직원 목록 (연락처 가림, IP 숨김)", sRow);
  r = await staff(`/staff/qna/${secretId}/answers`, { method: "POST", body: { content: "직원 답변" } });
  ok(r.status === 201, "직원 답변 등록");
  ok((await staff(`/staff/qna/${secretId}/hide`, { method: "POST" })).status !== 200 && (await staff(`/admin/qna/${secretId}`)).status === 403, "직원은 숨기기·관리자 API 불가");
  ok((await staff(`/public/qna/${secretId}`)).data.post.content !== undefined, "권한 있는 직원은 비밀글 바로 열람");
  await setQna({});

  console.log("10) 권한 · 연락처 비노출 최종 확인");
  ok((await pub("/admin/qna")).status === 401, "비로그인 관리자 API → 401");
  const all = [await pub("/public/qna"), await pub(`/public/qna/${secretId}`), await pub(`/public/qna/${linkId}`), await pub("/settings/public")];
  ok(all.every((x) => !x.text.includes("55510001") && !x.text.includes("5551-0001")), "공개 API 어디에도 연락처 원본 없음");
} finally {
  await pool.query("DELETE FROM leads WHERE phone LIKE '0105551%'");
  await pool.query("DELETE FROM qna_posts WHERE id > $1", [maxPost]);
  if (blockedIps.length) await pool.query("DELETE FROM blocked_ips WHERE ip = ANY($1)", [blockedIps]);
  if (staffId) {
    await pool.query("DELETE FROM access_logs WHERE user_id = $1", [staffId]);
    await pool.query("DELETE FROM users WHERE id = $1", [staffId]);
  }
  if (qnaSetting) await pool.query("UPDATE site_settings SET value = $1 WHERE key = 'qna'", [qnaSetting]);
  await admin("/admin/settings/qna", { method: "PUT", body: qnaSetting || { bannedWords: [], staffAnswer: false } }); // 서버 캐시도 되돌림
  await pool.end();
  console.log("\n(테스트 데이터 정리 완료)");
}
console.log(`\n결과: ${pass} 통과, ${fail} 실패`);
process.exit(fail ? 1 : 0);
