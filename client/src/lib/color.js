// 브랜드 색 계산 + 통신사 고유색(빨강·주황·마젠타) 범위 경고

export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = (rgb) => "#" + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");

export function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

/** t(0~1) 만큼 target 색과 섞기 */
const mix = (hex, target, t) => {
  const a = hexToRgb(hex), b = hexToRgb(target);
  return toHex(a.map((v, i) => v + (b[i] - v) * t));
};

/** --brand 하나로 진한 색(hover)·연한 색(선택 배경) 만들기 */
export function brandVars(hex) {
  if (!hexToRgb(hex)) return null;
  return { "--brand": hex, "--brand-strong": mix(hex, "#000000", 0.23), "--brand-soft": mix(hex, "#ffffff", 0.9) };
}

/**
 * 통신사 고유색과 겹치는지: 빨강(345~15°)·주황(15~45°)·마젠타(290~345°) 색상각,
 * 채도가 어느 정도 있고 너무 어둡거나 밝지 않을 때
 */
export function isCarrierLikeColor(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const [h, s, l] = rgbToHsl(rgb);
  if (s < 0.3 || l < 0.15 || l > 0.9) return false;
  return h >= 290 || h <= 45;
}
