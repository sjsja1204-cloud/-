// 편집 화면 공통 작은 부품
import { useRef, useState } from "react";
import { api } from "../../lib/api";

/** 위로 / 아래로 / 삭제 버튼 묶음 */
export function ItemTools({ i, n, onMove, onRemove, removeLabel = "삭제", confirmText }) {
  return (
    <span className="itools">
      <button type="button" className="ibtn" disabled={i === 0} onClick={() => onMove(i, -1)} aria-label="위로">▲</button>
      <button type="button" className="ibtn" disabled={i === n - 1} onClick={() => onMove(i, 1)} aria-label="아래로">▼</button>
      {onRemove && (
        <button type="button" className="ibtn danger" aria-label={removeLabel}
          onClick={() => (!confirmText || confirm(`${confirmText}\n\n삭제해도 '이전 버전'에서 되돌릴 수 있어요.`)) && onRemove(i)}>
          ✕
        </button>
      )}
    </span>
  );
}

/** 여러 줄 입력 ↔ 문자열 배열 (한 줄 = 한 항목) */
export function LinesInput({ value, onChange, rows = 3, placeholder }) {
  return (
    <textarea className="textarea" rows={rows} value={(value || []).join("\n")} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value.split("\n"))} />
  );
}

/** 라벨 + 입력 */
export function Field({ label, hint, children, wide }) {
  return (
    <label className={`efield ${wide ? "wide" : ""}`}>
      <span className="efield-label">{label}{hint && <span className="hint"> {hint}</span>}</span>
      {children}
    </label>
  );
}

/** 이미지 업로드 (2MB, jpg/png/webp — 서버에서 자동 리사이즈) */
export function ImageUpload({ value, onChange, kind = "popup" }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr("");
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setErr("jpg, png, webp 파일만 올릴 수 있어요.");
    if (file.size > 2 * 1024 * 1024) return setErr("2MB 이하 이미지만 올릴 수 있어요.");
    const form = new FormData();
    form.append("file", file);
    setBusy(true);
    try {
      const d = await api(`/admin/media?kind=${kind}`, { method: "POST", form });
      onChange(d.url);
    } catch (er) {
      setErr(er.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="imgup">
      {value ? <img src={value} alt="" /> : <div className="imgup-empty">이미지 없음</div>}
      <div className="imgup-btns">
        <button type="button" className="btn btn-sm" disabled={busy} onClick={() => ref.current?.click()}>{busy ? "올리는 중…" : value ? "이미지 바꾸기" : "이미지 올리기"}</button>
        {value && <button type="button" className="btn btn-sm" onClick={() => onChange("")}>이미지 빼기</button>}
        <span className="hint">jpg·png·webp, 2MB 이하</span>
      </div>
      {err && <span className="err">{err}</span>}
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pick} />
    </div>
  );
}
