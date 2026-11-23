// 환경변수는 전부 여기서만 읽는다.
function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`환경변수 ${name} 가 설정되지 않았습니다. (.env.example 참고)`);
  return v;
}

export const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  clientOrigins: (process.env.CLIENT_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN || "",
    chatId: process.env.TELEGRAM_CHAT_ID || "",
  },
  // Cloudflare R2 (이미지 업로드). 하나라도 비면 서버 폴더(uploads/)에 저장 — 로컬 개발용
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    bucket: process.env.R2_BUCKET || "",
    publicUrl: (process.env.R2_PUBLIC_URL || "").replace(/\/$/, ""),
    get enabled() {
      return Boolean(this.accountId && this.accessKeyId && this.secretAccessKey && this.bucket && this.publicUrl);
    },
  },
  trustProxy: Number(process.env.TRUST_PROXY ?? 1),
  cookieSameSite: (process.env.COOKIE_SAMESITE || "lax").toLowerCase(),
  isProd: process.env.NODE_ENV === "production",
};

if (config.isProd && config.jwtSecret.length < 32) {
  throw new Error("운영 환경에서는 JWT_SECRET 을 32자 이상으로 설정하세요.");
}
if (config.isProd && !config.r2.enabled) {
  console.warn("[경고] R2 환경변수가 없어 업로드 이미지를 서버 폴더에 저장합니다. Render 는 재시작 시 파일이 지워지니 R2 를 설정하세요.");
}
