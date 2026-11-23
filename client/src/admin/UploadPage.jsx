import { useEffect, useRef, useState } from "react";
import { api, download } from "../lib/api";
import { fmtDateTime } from "../lib/format";

const STATE_LABEL = { pending: "미확정", confirmed: "확정", cancelled: "취소" };

export default function UploadPage() {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [includeDup, setIncludeDup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [batches, setBatches] = useState([]);

  const loadBatches = () => api("/admin/upload/batches").then((d) => setBatches(d.batches)).catch(() => {});
  useEffect(() => { loadBatches(); }, []);

  const upload = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return setMsg({ err: true, text: ".xlsx 파일을 선택하세요." });
    const form = new FormData();
    form.append("file", file);
    setBusy(true);
    setMsg(null);
    try {
      setPreview(await api("/admin/upload/preview", { method: "POST", form }));
      setIncludeDup(false);
      loadBatches();
    } catch (er) {
      setMsg({ err: true, text: er.message });
    } finally {
      setBusy(false);
    }
  };

  const confirmUpload = async () => {
    const n = preview.summary.new + (includeDup ? preview.summary.duplicate : 0);
    if (!confirm(`${n}건을 저장합니다. 진행할까요?`)) return;
    setBusy(true);
    try {
      const r = await api(`/admin/upload/${preview.batchId}/confirm`, { method: "POST", body: { includeDuplicates: includeDup } });
      setMsg({ text: `${r.inserted}건 저장 완료 (제외 ${r.skipped}건). 저장된 DB는 미배정 상태입니다.` });
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
      loadBatches();
    } catch (er) {
      setMsg({ err: true, text: er.message });
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    await api(`/admin/upload/${preview.batchId}/cancel`, { method: "POST" }).catch(() => {});
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
    loadBatches();
  };

  return (
    <div>
      <h2 className="page-title">엑셀 업로드</h2>
      <div className="card" style={{ marginBottom: 12 }}>
        <ol className="hint" style={{ margin: "0 0 12px", paddingLeft: 18 }}>
          <li>양식을 내려받아 작성합니다. (컬럼: 이름, 연락처, 관심상품, 희망통신사, 메모)</li>
          <li>업로드하면 검증 결과를 미리 보여줍니다. 이 단계에서는 저장되지 않습니다.</li>
          <li>[확정]을 눌러야 저장됩니다. 오류 행은 저장되지 않습니다.</li>
        </ol>
        <form className="toolbar" style={{ margin: 0 }} onSubmit={upload}>
          <button type="button" className="btn btn-sm" onClick={() => download("/admin/upload/template", "upload-template.xlsx").catch((e) => setMsg({ err: true, text: e.message }))}>
            업로드 양식 다운로드
          </button>
          <input ref={fileRef} type="file" accept=".xlsx" aria-label="엑셀 파일" />
          <button className="btn btn-sm btn-primary" disabled={busy}>{busy && !preview ? "검증 중…" : "업로드 · 검증"}</button>
        </form>
      </div>

      {msg && <div className={`alert ${msg.err ? "alert-err" : "alert-ok"}`}>{msg.text}</div>}

      {preview && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 16 }}>미리보기 · {preview.filename}</h3>
          <div className="stat-grid">
            <div className="stat"><b>{preview.summary.total}</b><span>총 건수</span></div>
            <div className="stat"><b style={{ color: "var(--ok)" }}>{preview.summary.new}</b><span>신규</span></div>
            <div className="stat"><b style={{ color: "#7a5c00" }}>{preview.summary.duplicate}</b><span>중복</span></div>
            <div className="stat"><b style={{ color: "var(--danger)" }}>{preview.summary.error}</b><span>오류</span></div>
          </div>

          {preview.errors.length > 0 && <RowTable title={`오류 행 (${preview.errors.length}) — 저장되지 않음`} rows={preview.errors} />}
          {preview.duplicates.length > 0 && <RowTable title={`중복 행 (${preview.duplicates.length})`} rows={preview.duplicates} />}
          {preview.sample.length > 0 && <RowTable title={`신규 행 미리보기 (최대 20건)`} rows={preview.sample} />}

          <div className="toolbar" style={{ marginTop: 12 }}>
            {preview.summary.duplicate > 0 && (
              <label className="hint" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" checked={includeDup} onChange={(e) => setIncludeDup(e.target.checked)} /> 중복 행도 저장
              </label>
            )}
            <span className="spacer" />
            <button className="btn btn-sm" onClick={cancel} disabled={busy}>취소</button>
            <button className="btn btn-sm btn-primary" onClick={confirmUpload}
              disabled={busy || preview.summary.new + (includeDup ? preview.summary.duplicate : 0) === 0}>
              확정 ({preview.summary.new + (includeDup ? preview.summary.duplicate : 0)}건 저장)
            </button>
          </div>
        </div>
      )}

      <h3 style={{ fontSize: 15, margin: "18px 0 8px" }}>최근 업로드 내역</h3>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>배치</th><th>파일명</th><th>일시</th><th>업로드</th><th className="num">총</th><th className="num">저장</th><th className="num">중복</th><th className="num">오류</th><th>상태</th></tr></thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id}>
                <td>#{b.id}</td><td className="ellipsis">{b.filename}</td><td className="nowrap muted">{fmtDateTime(b.created_at)}</td>
                <td className="nowrap">{b.uploaded_by_name}</td><td className="num">{b.total}</td><td className="num">{b.inserted}</td>
                <td className="num">{b.duplicated}</td><td className="num">{b.errors}</td><td>{STATE_LABEL[b.state]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!batches.length && <div className="tbl-empty">업로드 내역이 없습니다.</div>}
      </div>
    </div>
  );
}

function RowTable({ title, rows }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h4 style={{ margin: "6px 0", fontSize: 14 }}>{title}</h4>
      <div className="tbl-wrap" style={{ maxHeight: 280, overflowY: "auto" }}>
        <table className="tbl">
          <thead><tr><th>행</th><th>이름</th><th>연락처</th><th>관심상품</th><th>통신사</th><th>사유</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.row}>
                <td>{r.row}</td><td>{r.name || "-"}</td><td className="nowrap">{r.phoneDisplay || "-"}</td>
                <td>{r.products?.join(", ") || "-"}</td><td>{r.carrier || "-"}</td>
                <td style={{ color: r.kind === "error" ? "var(--danger)" : r.kind === "duplicate" ? "#7a5c00" : "inherit" }}>{r.reason || "신규"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
