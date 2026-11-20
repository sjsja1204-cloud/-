// 최초 관리자 계정 생성: npm run seed:admin
// 비밀번호는 실행 시 입력받는다. (CI 등 자동화용으로 ADMIN_LOGIN_ID / ADMIN_PASSWORD / ADMIN_NAME 환경변수도 허용)
// 같은 아이디가 이미 있으면 비밀번호를 재설정하고 admin 으로 활성화한다.
import readline from "node:readline";
import bcrypt from "bcrypt";
import { pool } from "../src/db.js";

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      // 입력 문자를 * 로 표시
      rl._writeToOutput = (s) => rl.output.write(s.includes(question) ? s : "*");
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

try {
  const loginId = process.env.ADMIN_LOGIN_ID || (await ask("관리자 아이디: "));
  if (!/^[a-zA-Z0-9_.-]{3,50}$/.test(loginId)) throw new Error("아이디는 영문/숫자/_.- 3~50자");
  const name = process.env.ADMIN_NAME || (await ask("관리자 이름 (엔터=관리자): ")) || "관리자";
  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    password = await ask("비밀번호 (8자 이상): ", { hidden: true });
    const confirm = await ask("비밀번호 확인: ", { hidden: true });
    if (password !== confirm) throw new Error("비밀번호가 일치하지 않습니다.");
  }
  if (password.length < 8) throw new Error("비밀번호는 8자 이상이어야 합니다.");

  const hash = await bcrypt.hash(password, 12);
  const { rows } = await pool.query(
    `INSERT INTO users (login_id, password_hash, name, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (login_id) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin',
       is_active = TRUE, failed_attempts = 0, locked_until = NULL
     RETURNING id, login_id`,
    [loginId, hash, name]
  );
  console.log(`관리자 계정 준비 완료: ${rows[0].login_id} (id=${rows[0].id})`);
} catch (e) {
  console.error("실패:", e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
