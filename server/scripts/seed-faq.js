// 자주 묻는 질문 예시 입력 (관리자 > 자주 묻는 질문 에서 고치거나 지울 수 있음)
// FAQ 가 하나도 없을 때만 넣는다. 이미 있으면 아무것도 하지 않음.
// 사용: server 폴더에서 npm run seed:faq  (배포 시 migrate.js 가 최초 1회 자동으로 넣으므로 보통은 필요 없음)
// 목록은 seed/faqs.js
import { pool } from "../src/db.js";
import { faqs as FAQS } from "../seed/faqs.js";

try {
  const { rows } = await pool.query("SELECT count(*)::int AS n FROM faqs");
  if (rows[0].n > 0) {
    console.log(`자주 묻는 질문이 이미 ${rows[0].n}개 있어 넣지 않았습니다.`);
  } else {
    for (const [i, [category, question, answer]] of FAQS.entries()) {
      await pool.query("INSERT INTO faqs (category, question, answer, is_published, sort_order) VALUES ($1,$2,$3,true,$4)", [category, question, answer, i]);
    }
    console.log(`자주 묻는 질문 예시 ${FAQS.length}개를 넣었습니다. 관리자 > 자주 묻는 질문 에서 고치세요.`);
  }
} finally {
  await pool.end();
}
