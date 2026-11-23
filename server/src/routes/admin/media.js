// 관리자: 이미지 업로드 (팝업·배너). 2MB, jpg/png/webp, 자동 리사이즈
import { Router } from "express";
import multer from "multer";
import { ah, HttpError } from "../../lib/http.js";
import { logAccess } from "../../lib/accessLog.js";
import { saveImage, MAX_UPLOAD_BYTES } from "../../lib/storage.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }).single("file");
const SIZES = { popup: { maxWidth: 800, maxHeight: 1600 }, banner: { maxWidth: 1200, maxHeight: 900 }, logo: { maxWidth: 400, maxHeight: 200 } };

router.post(
  "/",
  (req, res, next) =>
    upload(req, res, (err) => {
      if (err?.code === "LIMIT_FILE_SIZE") return next(new HttpError(400, "이미지는 2MB 이하만 올릴 수 있습니다."));
      next(err);
    }),
  ah(async (req, res) => {
    if (!req.file) throw new HttpError(400, "이미지 파일을 선택하세요.");
    if (!/^image\/(jpeg|png|webp)$/.test(req.file.mimetype)) throw new HttpError(400, "jpg, png, webp 파일만 올릴 수 있습니다.");
    const kind = SIZES[req.query.kind] ? req.query.kind : "popup";
    const out = await saveImage(req.file.buffer, { ...SIZES[kind], folder: kind });
    await logAccess(req, "media.upload", null, `${kind} ${out.url}`);
    res.status(201).json(out);
  })
);

export default router;
