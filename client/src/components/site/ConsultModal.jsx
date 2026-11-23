import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSiteData } from "../../lib/siteData";
import { api } from "../../lib/api";
import { getAttribution } from "../../lib/utm";
import { hyphenPhone, isValidMobile, formatWon } from "../../lib/format";
import PrivacyConsentText from "./PrivacyConsentText";
import Icon from "./Icon";

/**
 * 공통 접수 창 — 빠른 메뉴(지원금 안내·맞춤 상담·상품 찾기)와 간편 견적이 같이 쓴다.
 * 제목·안내 문구만 유형별로 다르다 (관리자 > 사이트 설정 > 빠른 상담 메뉴).
 * PC: 가운데 창, 모바일: 아래에서 올라오는 시트
 */
export default function ConsultModal() {
  const { consultModal, closeConsult } = useSiteData();
  if (!consultModal) return null;
  // key: 다른 버튼으로 다시 열면 입력값 초기화
  return <ModalBody key={consultModal.type + (consultModal.quote ? JSON.stringify(consultModal.quote) : "")} m={consultModal} onClose={closeConsult} />;
}

function ModalBody({ m, onClose }) {
  const { consult } = useSiteData();
  const text = consult.modals?.[m.type] || {};
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");
  const [done, setDone] = useState(false);
  const firstRef = useRef(null);
  const boxRef = useRef(null);

  // 배경 스크롤 잠금 + 첫 입력칸 포커스 + ESC 닫기 + 닫으면 원래 버튼으로 포커스 복귀
  useEffect(() => {
    const prev = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    firstRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && boxRef.current) {
        // 창 안에서만 탭 이동
        const f = boxRef.current.querySelectorAll("button, input, a[href]");
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [onClose]);

  // 완료 후 3초 뒤 닫힘
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [done, onClose]);

  const submit = async (e) => {
    e.preventDefault();
    setServerError("");
    const errs = {};
    if (!name.trim()) errs.name = "이름을 입력하세요.";
    if (!isValidMobile(phone)) errs.phone = "휴대폰 번호를 확인해 주세요. (예: 010-1234-5678)";
    if (!consent) errs.consent = "개인정보 수집·이용에 동의해 주세요.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const q = m.quote;
      await api("/public/leads", {
        method: "POST",
        body: {
          name: name.trim(), phone, consent: true, website, inquiryType: m.type,
          quote: q ? { carrier: q.carrier, service: q.service, speed: q.speed, mobileBundle: q.mobileBundle } : undefined,
          ...getAttribution(),
        },
      });
      setDone(true);
    } catch (er) {
      setServerError(er.message);
    } finally {
      setBusy(false);
    }
  };

  const q = m.quote;
  return (
    <div className="cm-dim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cm" role="dialog" aria-modal="true" aria-labelledby="cm-title" ref={boxRef}>
        <button type="button" className="cm-close" onClick={onClose} aria-label="닫기"><Icon name="close" /></button>
        {done ? (
          <div className="cm-done" role="status">
            <span className="cm-done-ic"><Icon name="check" size={30} stroke={2.4} /></span>
            <h3 id="cm-title">{consult.doneTitle}</h3>
            {consult.doneDesc && <p>{consult.doneDesc}</p>}
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <h3 id="cm-title" className="cm-title">{text.title || "상담 신청"}</h3>
            {text.desc && <p className="cm-desc">{text.desc}</p>}

            {q && (
              <div className="cm-quote">
                <span className="cm-quote-label">선택한 조건</span>
                <b>{[q.carrierName, q.serviceLabel, q.speed, q.mobileBundle ? q.mobileLabel : null].filter(Boolean).join(" · ")}</b>
                <span>{q.price ? `예상 월 ${formatWon(q.price)}${q.from ? "부터" : ""}` : "요금은 상담 시 안내"}</span>
              </div>
            )}

            <div className="field">
              <label htmlFor="cm-name">이름</label>
              <input id="cm-name" ref={firstRef} className="input" value={name} maxLength={50} autoComplete="name"
                onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} />
              {errors.name && <span className="err">{errors.name}</span>}
            </div>
            <div className="field">
              <label htmlFor="cm-phone">연락처</label>
              <input id="cm-phone" className="input" value={phone} inputMode="numeric" autoComplete="tel" placeholder="010-0000-0000"
                onChange={(e) => setPhone(hyphenPhone(e.target.value))} aria-invalid={!!errors.phone} />
              {errors.phone && <span className="err">{errors.phone}</span>}
            </div>

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
                <p className="hint" style={{ margin: "-4px 0 12px" }}>자세한 내용은 <Link to="/privacy" onClick={onClose}>개인정보처리방침</Link>을 확인하세요.</p>
              </>
            )}
            {errors.consent && <p className="err" style={{ marginTop: 0 }}>{errors.consent}</p>}
            {serverError && <p className="err" role="alert">{serverError}</p>}

            <button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? "접수 중…" : consult.submitLabel || "상담 신청하기"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
