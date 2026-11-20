import { useState } from "react";
import { Link } from "react-router-dom";
import LeadFields, { emptyLead, validateLead } from "../lead/LeadFields";
import PrivacyConsentText from "./PrivacyConsentText";
import { api } from "../../lib/api";
import { getAttribution } from "../../lib/utm";

/** 고객 상담 신청 폼 */
export default function LeadForm() {
  const [value, setValue] = useState(emptyLead);
  const [consent, setConsent] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setServerError("");
    const errs = validateLead(value);
    if (!consent) errs.consent = "개인정보 수집·이용에 동의해 주세요.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    try {
      await api("/public/leads", {
        method: "POST",
        body: { ...value, consent: true, website, ...getAttribution() },
      });
      setDone(true);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="form-done" role="status">
        <div className="form-done-icon" aria-hidden>✓</div>
        <h3>접수되었습니다.</h3>
        <p>곧 연락드리겠습니다.</p>
        <button className="btn" onClick={() => { setValue(emptyLead); setConsent(false); setDone(false); }}>
          처음으로
        </button>
      </div>
    );
  }

  return (
    <form className="lead-form" onSubmit={submit} noValidate>
      <LeadFields value={value} onChange={setValue} errors={errors} idPrefix="apply" />

      {/* honeypot: 봇만 채우는 숨김 필드 */}
      <div className="hp" aria-hidden="true">
        <label>웹사이트<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" /></label>
      </div>

      <div className="consent">
        <label className="consent-check">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span><b>[필수]</b> 개인정보 수집·이용에 동의합니다.</span>
        </label>
        <button type="button" className="consent-toggle" aria-expanded={showConsent} onClick={() => setShowConsent((v) => !v)}>
          {showConsent ? "닫기" : "내용 보기"}
        </button>
      </div>
      {showConsent && (
        <>
          <PrivacyConsentText />
          <p className="hint" style={{ margin: "-4px 0 12px" }}>자세한 내용은 <Link to="/privacy">개인정보처리방침</Link>을 확인하세요.</p>
        </>
      )}
      {errors.consent && <p className="err" style={{ marginTop: 0 }}>{errors.consent}</p>}
      {serverError && <p className="err" role="alert">{serverError}</p>}

      <button className="btn btn-primary btn-lg btn-block" disabled={submitting}>
        {submitting ? "접수 중…" : "무료 상담 신청하기"}
      </button>
    </form>
  );
}
