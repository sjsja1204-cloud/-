import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config.js";
import { query } from "./db.js";
import { HttpError, ah } from "./lib/http.js";
import { requireAuth } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import publicRoutes from "./routes/public.js";
import staffRoutes from "./routes/staff.js";
import adminLeadRoutes from "./routes/admin/leads.js";
import adminUserRoutes from "./routes/admin/users.js";
import adminUploadRoutes from "./routes/admin/upload.js";
import adminStatsRoutes from "./routes/admin/stats.js";
import adminPostRoutes from "./routes/admin/posts.js";
import contentRoutes from "./routes/content.js";
import siteRoutes from "./routes/site.js";
import adminContentRoutes from "./routes/admin/content.js";
import adminSettingsRoutes from "./routes/admin/settings.js";
import adminPopupRoutes from "./routes/admin/popups.js";
import adminMediaRoutes from "./routes/admin/media.js";
import { LOCAL_DIR } from "./lib/storage.js";

const app = express();

// Render(1단) / Cloudflare Pages 프록시 경유(2단) — req.ip 를 실제 고객 IP 로 맞추기 위함
app.set("trust proxy", config.trustProxy);
app.disable("x-powered-by");

app.use(helmet());
app.use(
  cors({
    origin(origin, cb) {
      // 같은 도메인 요청(Origin 없음) 또는 허용 목록만 통과
      if (!origin || config.clientOrigins.includes(origin)) return cb(null, true);
      cb(new HttpError(403, "허용되지 않은 출처입니다."));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.get("/api/health", ah(async (req, res) => {
  await query("SELECT 1");
  res.json({ ok: true });
}));

app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/public", contentRoutes);
app.use("/api", siteRoutes); // /api/plans, /api/site, /api/popups, /api/settings/public
// R2 미설정 시 업로드 이미지 (로컬 개발용)
app.use("/api/uploads", express.static(LOCAL_DIR, { maxAge: "30d", immutable: true, fallthrough: false }));

// 상태값 (로그인 사용자 공통)
app.get(
  "/api/meta/statuses",
  requireAuth(),
  ah(async (req, res) => {
    const { rows } = await query("SELECT id, name, sort_order, is_final, is_default, is_hidden FROM lead_statuses ORDER BY sort_order, id");
    res.json({ statuses: rows });
  })
);

// 권한 검사는 라우터 단위로 서버에서 강제
app.use("/api/staff", requireAuth("staff"), staffRoutes);
app.use("/api/admin/leads", requireAuth("admin"), adminLeadRoutes);
app.use("/api/admin/users", requireAuth("admin"), adminUserRoutes);
app.use("/api/admin/upload", requireAuth("admin"), adminUploadRoutes);
app.use("/api/admin/stats", requireAuth("admin"), adminStatsRoutes);
app.use("/api/admin/posts", requireAuth("admin"), adminPostRoutes);
app.use("/api/admin/content", requireAuth("admin"), adminContentRoutes);
app.use("/api/admin/settings", requireAuth("admin"), adminSettingsRoutes);
app.use("/api/admin/popups", requireAuth("admin"), adminPopupRoutes);
app.use("/api/admin/media", requireAuth("admin"), adminMediaRoutes);

app.use("/api", (req, res) => res.status(404).json({ error: "존재하지 않는 API 입니다." }));

// 에러 핸들러
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...(err.extra || {}) });
  }
  if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "잘못된 요청 형식입니다." });
  if (err?.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "파일은 5MB 이하만 업로드할 수 있습니다." });
  console.error(err);
  res.status(500).json({ error: "서버 오류가 발생했습니다." });
});

app.listen(config.port, () => {
  console.log(`[담아가넷 API] http://localhost:${config.port}  (허용 출처: ${config.clientOrigins.join(", ")})`);
});
