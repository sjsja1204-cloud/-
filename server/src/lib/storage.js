// 이미지 업로드: Cloudflare R2 (환경변수 R2_* 가 있으면) / 없으면 서버 폴더 (로컬 개발용)
// 업로드 이미지는 자동 리사이즈 후 webp 로 저장
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { config } from "../config.js";
import { HttpError } from "./http.js";

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["jpeg", "png", "webp"]);
export const LOCAL_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "uploads");

let s3;
async function r2() {
  if (!s3) {
    const { S3Client } = await import("@aws-sdk/client-s3");
    s3 = new S3Client({
      region: "auto",
      endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: config.r2.accessKeyId, secretAccessKey: config.r2.secretAccessKey },
    });
  }
  return s3;
}

/**
 * @param {Buffer} buf 업로드 원본
 * @param {{ maxWidth?: number, maxHeight?: number, folder?: string }} opt
 * @returns {Promise<{ url: string, width: number, height: number }>}
 */
export async function saveImage(buf, { maxWidth = 1600, maxHeight = 1600, folder = "img" } = {}) {
  let meta;
  try {
    meta = await sharp(buf).metadata();
  } catch {
    throw new HttpError(400, "이미지 파일을 읽을 수 없습니다. jpg, png, webp 파일만 올릴 수 있습니다.");
  }
  if (!ALLOWED.has(meta.format)) throw new HttpError(400, "jpg, png, webp 파일만 올릴 수 있습니다.");

  const { data, info } = await sharp(buf)
    .rotate() // 휴대폰 사진 방향 보정
    .resize({ width: maxWidth, height: maxHeight, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  const name = `${folder}/${new Date().toISOString().slice(0, 10)}-${crypto.randomBytes(6).toString("hex")}.webp`;

  if (config.r2.enabled) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await (await r2()).send(new PutObjectCommand({
      Bucket: config.r2.bucket,
      Key: name,
      Body: data,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    }));
    return { url: `${config.r2.publicUrl}/${name}`, width: info.width, height: info.height };
  }

  const file = path.join(LOCAL_DIR, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
  return { url: `/api/uploads/${name}`, width: info.width, height: info.height };
}
