import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSiteData, bundleOn } from "../../lib/siteData";
import { api } from "../../lib/api";
import { getAttribution } from "../../lib/utm";
import { hyphenPhone, isValidMobile, formatWon } from "../../lib/format";
import { SERVICE_KEYS, estimate, planQuote, priceTags } from "../../lib/quote";
import PrivacyConsentText from "./PrivacyConsentText";
import CarrierChip from "./CarrierChip";
import Icon from "./Icon";

const UNKNOWN = "unknown"; // 통신사 '잘 모르겠어요(추천받기)'
const REC = "__rec"; // 요금제 '추천받기'

/**
 * 공통 접수 창 (2단계) — 빠른 메뉴(지원금 안내·맞춤 상담·상품 찾기), 간편 견적, 통신사 페이지가 같이 쓴다.
 * 1단계 상품 선택(통신사·가입 서비스 필수) → 2단계 연락처. 제목·안내·신청 버튼 문구는 유형별
 * (관리자 > 사이트 설정 > 빠른 상담 메뉴). 요금제·요금은 관리자 > 요금표. PC: 가운데 창, 모바일: 아래 시트.
 */
export default function ConsultModal() {
  const { consultModal, closeConsult } = useSiteData();
  if (!consultModal) return null;
  // key: 다른 버튼으로 다시 열면 입력값 초기화
  return <ModalBody key={consultModal.type + (consultModal.quote ? JSON.stringify(consultModal.quote) : "")} m={consultModal} onClose={closeConsult} />;
}

function Opt({ on, onClick, children }) {
  return <button type="button" className={`qw-opt ${on ? "on" : ""}`} aria-pressed={on} onClick={onClick}>{children}</button>;
}

/** 미리 받은 값(간편 견적·통신사 페이지) → 1단계 선택값 */
function initialSelection(pre, carriers) {
  const c = pre?.carrier && carriers.find((x) => x.id === pre.carrier);
  const sel = { carrier: c ? c.id : null, service: null, speed: null, internetPlan: null, tvPlan: null, mobile: null };
  if (!c) return sel;
  const bundle = bundleOn(c);
  if (pre.service && SERVICE_KEYS.includes(pre.service) && (bundle || pre.service !== "internet_tv_usim")) sel.service = pre.service;
  if (bundle && typeof pre.mobileBundle === "boolean") sel.mobile = pre.mobileBundle;
  if (pre.speed) {
    // 속도는 기억해서 TV 요금제를 고르기 전까지 그 속도의 '~부터' 요금을 보여 줌.
    // 그 속도의 인터넷 상품이 하나뿐이면 요금제까지 채움
    const rows = c.priceTable.rows.filter((r) => r.speed === pre.speed);
    if (rows.length) sel.speed = pre.speed;
    if (rows.length === 1) sel.internetPlan = rows[0].internet;
  }
  return sel;
}

function ModalBody({ m, onClose }) {
  const { consult, carriers, quote: qt } = useSiteData();
  const text = consult.modals?.[m.type] || {};
  const [sel, setSel] = useState(() => initialSelection(m.quote, carriers));
  const [step, setStep] = useState(() => (sel.carrier && sel.service ? 2 : 1));
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");
  const [done, setDone] = useState(false);
  const boxRef = useRef(null);
  const titleRef = useRef(null);

  const carrier = carriers.find((c) => c.id === sel.carrier) || null;
  const unknown = sel.carrier === UNKNOWN;
  const bundle = !carrier || bundleOn(carrier);
  const services = SERVICE_KEYS.filter((k) => bundle || k !== "internet_tv_usim");
  const withTv = sel.service && sel.service !== "internet";
  const rows = carrier?.priceTable.rows || [];
  const tvPlans = carrier?.priceTable.tvPlans || [];
  const showPlans = carrier && rows.length > 0;

  // 배경 스크롤 잠금 + ESC 닫기 + 창 안에서만 탭 이동 + 닫으면 원래 버튼으로 포커스 복귀
  useEffect(() => {
    const prev = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && boxRef.current) {
        const f = boxRef.current.querySelectorAll("button:not([disabled]), input, a[href]");
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

  // 단계가 바뀌면 맨 위로 + 제목에 포커스 (화면 읽기 프로그램이 새 단계를 읽도록)
  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = 0;
    titleRef.current?.focus();
  }, [step, done]);

  // 완료 후 3초 뒤 닫힘
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [done, onClose]);

  const pickCarrier = (id) => setSel((s) => {
    if (s.carrier === id) return s;
    const c = carriers.find((x) => x.id === id);
    const b = !c || bundleOn(c);
    return {
      carrier: id, speed: null, internetPlan: null, tvPlan: null,
      service: !b && s.service === "internet_tv_usim" ? null : s.service,
      mobile: b ? s.mobile : null,
    };
  });
  const pickService = (k) => setSel((s) => ({ ...s, service: k, tvPlan: k === "internet" ? null : s.tvPlan }));
  // 요금제를 직접 고르면 간편 견적에서 넘어온 속도는 버림
  const pickInternet = (v) => setSel((s) => ({ ...s, internetPlan: v, speed: null }));
  const pickTv = (v) => setSel((s) => ({ ...s, tvPlan: v }));

  // 월 요금: 요금제를 고르면 그 칸, 간편 견적 속도만 있으면 그 속도의 최저 요금(부터)
  const price = (() => {
    if (!carrier || !sel.service) return undefined;
    const ip = sel.internetPlan && sel.internetPlan !== REC ? sel.internetPlan : null;
    const tp = sel.tvPlan && sel.tvPlan !== REC ? sel.tvPlan : null;
    const mob = bundle && sel.mobile === true; // 휴대폰 결합이면 인터넷 결합 할인액을 뺀 금액
    if (ip && (!withTv || tp)) { const q = planQuote(carrier, sel.service, ip, tp, mob); return { value: q?.price ?? null, from: false, q }; }
    if (sel.speed) { const e = estimate(carrier, sel.service, sel.speed, mob); return { value: e?.price ?? null, from: !!e?.from, q: e }; }
    return undefined; // 아직 다 안 고름
  })();
  const priceText = price === undefined ? "" : price.value ? `월 ${formatWon(price.value)}${price.from ? "부터" : ""} · 와이파이 포함` : "상담 시 안내";
  const tags = price?.value ? priceTags(carrier, price.q) : [];

  const summary = [
    unknown ? "통신사 추천받기" : carrier?.name,
    sel.service && qt.services?.[sel.service],
    unknown ? null : sel.internetPlan === REC ? "인터넷 요금제 추천" : sel.internetPlan || (sel.speed && `${sel.speed} 속도`),
    unknown || !withTv ? null : sel.tvPlan === REC ? "TV 요금제 추천" : sel.tvPlan,
    bundle && sel.mobile ? qt.mobileYes || "휴대폰 결합" : null,
  ].filter(Boolean);

  const next = (e) => {
    e.preventDefault();
    const errs = {};
    if (!sel.carrier) errs.carrier = "통신사를 선택하세요.";
    if (!sel.service) errs.service = "가입 서비스를 선택하세요.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setStep(2);
  };

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
    const plan = (v) => (v && v !== REC ? v : null);
    try {
      await api("/public/leads", {
        method: "POST",
        body: {
          name: name.trim(), phone, consent: true, website, inquiryType: m.type,
          quote: {
            carrier: sel.carrier, service: sel.service,
            speed: unknown ? null : sel.speed,
            internetPlan: unknown ? null : plan(sel.internetPlan),
            tvPlan: unknown || !withTv ? null : plan(sel.tvPlan),
            mobileBundle: bundle ? sel.mobile : null,
          },
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

  return (
    <div className="cm-dim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cm cm-steps" role="dialog" aria-modal="true" aria-labelledby="cm-title" ref={boxRef}>
        <button type="button" className="cm-close" onClick={onClose} aria-label="닫기"><Icon name="close" /></button>
        {done ? (
          <div className="cm-done" role="status">
            <span className="cm-done-ic"><Icon name="check" size={30} stroke={2.4} /></span>
            <h3 id="cm-title" ref={titleRef} tabIndex={-1}>{consult.doneTitle}</h3>
            {consult.doneDesc && <p>{consult.doneDesc}</p>}
          </div>
        ) : (
          <>
            <p className="cm-step" aria-live="polite"><b>{step}</b>/2 · {step === 1 ? "상품 선택" : "연락처"}</p>
            <h3 id="cm-title" className="cm-title" ref={titleRef} tabIndex={-1}>{text.title || "상담 신청"}</h3>
            {text.desc && <p className="cm-desc">{text.desc}</p>}

            {step === 1 ? (
              <form onSubmit={next} noValidate>
                <fieldset className="cm-group">
                  <legend>통신사 <em>필수</em></legend>
                  <div className="cm-chips">
                    {carriers.map((c) => <CarrierChip key={c.id} carrier={c} selected={sel.carrier === c.id} onSelect={pickCarrier} />)}
                    <button type="button" className={`cchip ${unknown ? "on" : ""}`} aria-pressed={unknown} onClick={() => pickCarrier(UNKNOWN)}>
                      <span>잘 모르겠어요(추천받기)</span>
                    </button>
                  </div>
                  {errors.carrier && <span className="err">{errors.carrier}</span>}
                </fieldset>

                <fieldset className="cm-group">
                  <legend>가입 서비스 <em>필수</em></legend>
                  <div className="qw-opts">
                    {services.map((k) => <Opt key={k} on={sel.service === k} onClick={() => pickService(k)}>{qt.services?.[k] || k}</Opt>)}
                  </div>
                  {sel.service === "internet_tv_usim" && qt.usimNotice && <p className="qw-notice"><Icon name="info" size={16} />{qt.usimNotice}</p>}
                  {errors.service && <span className="err">{errors.service}</span>}
                </fieldset>

                {showPlans && (
                  <fieldset className="cm-group">
                    <legend>인터넷 요금제 <span>선택</span></legend>
                    <div className="qw-opts">
                      {rows.map((r) => <Opt key={r.internet} on={sel.internetPlan === r.internet} onClick={() => pickInternet(r.internet)}>{r.internet}</Opt>)}
                      <Opt on={sel.internetPlan === REC} onClick={() => pickInternet(REC)}>추천받기</Opt>
                    </div>
                  </fieldset>
                )}

                {showPlans && withTv && tvPlans.length > 0 && (
                  <fieldset className="cm-group">
                    <legend>TV 요금제 <span>선택</span></legend>
                    <div className="qw-opts">
                      {tvPlans.map((t) => <Opt key={t} on={sel.tvPlan === t} onClick={() => pickTv(t)}>{t}</Opt>)}
                      <Opt on={sel.tvPlan === REC} onClick={() => pickTv(REC)}>추천받기</Opt>
                    </div>
                  </fieldset>
                )}

                {bundle && (
                  <fieldset className="cm-group">
                    <legend>휴대폰 결합 <span>선택</span></legend>
                    <div className="qw-opts">
                      <Opt on={sel.mobile === false} onClick={() => setSel((s) => ({ ...s, mobile: false }))}>{qt.mobileNo || "선택 안 함"}</Opt>
                      <Opt on={sel.mobile === true} onClick={() => setSel((s) => ({ ...s, mobile: true }))}>{qt.mobileYes || "휴대폰 결합"}</Opt>
                    </div>
                  </fieldset>
                )}

                {carrier && !showPlans && <p className="cm-hint">이 통신사 요금은 상담 시 안내해 드립니다.</p>}
                {priceText && (
                  <div className="cm-price" aria-live="polite">
                    <span>예상 월 요금</span>
                    <b>{priceText}</b>
                    {tags.length > 0 && <p className="price-tags">{tags.map((x) => <span key={x}>{x}</span>)}</p>}
                  </div>
                )}

                <button className="btn btn-primary btn-lg btn-block">다음</button>
              </form>
            ) : (
              <form onSubmit={submit} noValidate>
                <div className="cm-quote">
                  <span className="cm-quote-label">선택한 상품</span>
                  <b>{summary.join(" · ")}</b>
                  {priceText && <span>{price?.value ? `예상 ${priceText}${tags.length ? ` · ${tags.join(" · ")}` : ""}` : "요금은 상담 시 안내"}</span>}
                  <button type="button" className="cm-back" onClick={() => setStep(1)}><Icon name="chevronLeft" size={16} />이전 (수정하기)</button>
                </div>

                <div className="field">
                  <label htmlFor="cm-name">이름</label>
                  <input id="cm-name" className="input" value={name} maxLength={50} autoComplete="name"
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

                <div className="cm-actions">
                  <button type="button" className="btn btn-lg" onClick={() => setStep(1)}>이전</button>
                  <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? "접수 중…" : text.submitLabel || consult.submitLabel || "상담 신청하기"}</button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
