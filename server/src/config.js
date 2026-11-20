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
  trustProxy: Number(process.env.TRUST_PROXY ?? 1),
  cookieSameSite: (process.env.COOKIE_SAMESITE || "lax").toLowerCase(),
  isProd: process.env.NODE_ENV === "production",
};

if (config.isProd && config.jwtSecret.length < 32) {
  throw new Error("운영 환경에서는 JWT_SECRET 을 32자 이상으로 설정하세요.");
}
