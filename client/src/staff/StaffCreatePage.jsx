import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import LeadFields, { emptyLead, validateLead } from "../components/lead/LeadFields";

/** 직원 직접 접수: 전화로 들어온 고객 등록 → 출처 staff, 본인에게 자동 배정 */
export default function StaffCreatePage() {
  const nav = useNavigate();
  const [value, setValue] = useState(emptyLead);
  const [memo, setMemo] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const errs = validateLead(value);
    // TODO(확인필요): 전화 접수 고객의 개인정보 동의를 구두로 받는 절차 확인
    if (!consent) errs.consent = "고객에게 개인정보 수집·이용 동의를 받았는지 확인해 주세요.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setErr("");
    try {
      await api("/staff/leads", { method: "POST", body: { ...value, memo, consent: true } });
      alert("등록되었습니다. 내 DB에 추가되었습니다.");
      nav("/staff");
    } catch (er) {
      setErr(er.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="staff-page" style={{ maxWidth: 560 }} onSubmit={submit} noValidate>
      <h2 className="page-title">직접 접수</h2>
      <p className="hint" style={{ marginTop: -6 }}>전화로 문의한 고객을 등록합니다. 등록하면 내 DB로 자동 배정됩니다.</p>
      <div className="card">
        <LeadFields value={value} onChange={setValue} errors={errors} idPrefix="staffnew" />
        <div className="field">
          <label htmlFor="staffnew-memo">상담 메모 <span className="hint">(선택)</span></label>
          <textarea id="staffnew-memo" className="textarea" value={memo} maxLength={2000} onChange={(e) => setMemo(e.target.value)} />
        </div>
        <label className="consent-check" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ width: 20, height: 20, accentColor: "var(--brand)" }} />
          <span>고객에게 개인정보 수집·이용 동의를 받았습니다.</span>
        </label>
        {errors.consent && <p className="err">{errors.consent}</p>}
        {err && <div className="alert alert-err">{err}</div>}
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? "등록 중…" : "등록"}</button>
      </div>
    </form>
  );
}
