import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import SiteLayout from "../../components/site/SiteLayout";
import PageHero from "../../components/site/PageHero";
import Icon from "../../components/site/Icon";
import Turnstile from "../../components/site/Turnstile";
import { api } from "../../lib/api";
import { useSiteData } from "../../lib/siteData";
import { hyphenPhone, isValidMobile } from "../../lib/format";
import { looksLikePhone, looksLikeLink } from "../../lib/qna";
import { csTabs } from "./csTabs";
import "./qna.css";

/**
 * 질문 작성 (/support/qna/write) · 수정 (?edit=ID, 글 보기에서 비밀번호 확인 후 넘어옴)
 * 로그인 없이 이름·비밀번호로 작성. 연락처는 관리자만 보고 공개 화면엔 절대 나오지 않음.
 */
export default function QnaWritePage() {
  const { turnstileSiteKey } = useSiteData();
  const [sp] = useSearchParams();
  const { state } = useLocation();
  const nav = useNavigate();
  const editId = Number(sp.get("edit")) || null;
  const editing = editId && state?.post?.id === editId && state.password ? state : null;

  const [f, setF] = useState(() => editing
    ? { name: "", password: "", phone: "", title: editing.post.title, content: editing.post.content, isSecret: editing.post.isSecret }
    : { name: "", password: "", phone: "", title: "", content: "", isSecret: true });
  const [consent, setConsent] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [token, setToken] = useState("");
  const [tsReset, setTsReset] = useState(0);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  if (editId && !editing) return <Navigate to={`/support/qna/${editId}`} replace />;

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const phoneInBody = looksLikePhone(f.title) || looksLikePhone(f.content);
  const hasLink = looksLikeLink(f.title) || looksLikeLink(f.content);

  const validate = () => {
    const e = {};
    if (!editing) {
      if (!f.name.trim()) e.name = "이름을 입력하세요.";
      if (f.password.length < 4) e.password = "비밀번호는 4자 이상 입력하세요.";
      if (f.phone && !isValidMobile(f.phone)) e.phone = "휴대폰 번호 형식으로 입력하세요. (예: 010-1234-5678)";
      if (!consent) e.consent = "개인정보 수집·이용에 동의해 주세요.";
      if (turnstileSiteKey && !token) e.turnstile = "자동 등록 방지 확인란을 체크해 주세요.";
    }
    if (!f.title.trim()) e.title = "제목을 입력하세요.";
    if (!f.content.trim()) e.content = "내용을 입력하세요.";
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setServerError("");
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      document.querySelector(".qna-form [aria-invalid='true']")?.focus();
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        const r = await api(`/public/qna/${editId}`, { method: "PUT", body: { password: editing.password, title: f.title, content: f.content, isSecret: f.isSecret } });
        if (r.status === "review") setDone({ review: true, edit: true });
        else nav(`/support/qna/${editId}`, { replace: true, state: { password: editing.password } });
      } else {
        const r = await api("/public/qna", {
          method: "POST",
          body: { name: f.name, password: f.password, phone: f.phone, title: f.title, content: f.content, isSecret: f.isSecret, consent: true, website, turnstileToken: token },
        });
        if (r.status === "review" || !r.id) setDone({ review: r.status === "review" });
        else nav(`/support/qna/${r.id}`, { replace: true, state: { password: f.password, justWritten: true } });
      }
    } catch (er) {
      setServerError(er.message);
      setTsReset((n) => n + 1); // 캡차 토큰은 한 번만 쓸 수 있어 다시 확인
    } finally {
      setBusy(false);
    }
  };

  const title = editing ? "질문 수정" : "질문하기";
  return (
    <SiteLayout title={title}>
      <PageHero title="고객센터" crumbs={[["고객센터", "/support"], ["질문/답변", "/support/qna"], [title]]} tabs={csTabs} />
      <section className="sec">
        <div className="site-inner narrow">
          {done ? (
            <div className="form-done qna-done" role="status">
              <div className="form-done-icon" aria-hidden>✓</div>
              <h3>{done.edit ? "수정되었습니다." : "질문이 등록되었습니다."}</h3>
              <p>{done.review ? "링크가 들어 있는 글은 담아가넷이 확인한 뒤 공개돼요. 조금만 기다려 주세요." : "답변이 등록되면 목록에서 확인할 수 있어요."}</p>
              <Link to="/support/qna" className="btn">목록으로</Link>
            </div>
          ) : (
            <form className="qna-form" onSubmit={submit} noValidate>
              <h2 className="qna-form-title">{title}</h2>
              {editing && <p className="hint">작성자·비밀번호·연락처는 바꿀 수 없어요. 답변이 달린 뒤에는 수정할 수 없습니다.</p>}

              {!editing && (
                <div className="qna-grid">
                  <Field id="qn-name" label="이름" required error={errors.name}>
                    <input id="qn-name" className="input" value={f.name} maxLength={30} autoComplete="name" placeholder="홍길동"
                      aria-invalid={!!errors.name} onChange={(e) => set("name", e.target.value)} />
                    <small className="hint">목록에는 가운데 글자를 가려서 보여요 (예: 홍*동)</small>
                  </Field>
                  <Field id="qn-pw" label="비밀번호" required error={errors.password}>
                    <input id="qn-pw" type="password" className="input" value={f.password} minLength={4} maxLength={50} autoComplete="new-password"
                      aria-invalid={!!errors.password} onChange={(e) => set("password", e.target.value)} />
                    <small className="hint">4자 이상 · 비밀글 열람, 수정·삭제에 필요해요</small>
                  </Field>
                  <Field id="qn-phone" label="연락처" optional error={errors.phone} wide>
                    <input id="qn-phone" className="input" inputMode="numeric" value={f.phone} maxLength={13} autoComplete="tel" placeholder="010-0000-0000"
                      aria-invalid={!!errors.phone} onChange={(e) => set("phone", hyphenPhone(e.target.value))} />
                    <small className="hint"><Icon name="lock" size={13} /> 담아가넷 관리자만 볼 수 있고 홈페이지에는 절대 공개되지 않아요. 전화 상담을 원하시면 남겨 주세요.</small>
                  </Field>
                </div>
              )}

              <Field id="qn-title" label="제목" required error={errors.title}>
                <input id="qn-title" className="input" value={f.title} maxLength={100} aria-invalid={!!errors.title} onChange={(e) => set("title", e.target.value)} />
              </Field>
              <Field id="qn-content" label="내용" required error={errors.content}>
                <textarea id="qn-content" className="textarea" rows={10} value={f.content} maxLength={5000} aria-invalid={!!errors.content}
                  placeholder="사용 중인 통신사, 궁금한 상품 등을 적어 주시면 더 정확히 답변드릴 수 있어요." onChange={(e) => set("content", e.target.value)} />
                <small className="hint qna-len">{f.content.length.toLocaleString("ko-KR")} / 5,000</small>
              </Field>
              <p className={`qna-tip ${phoneInBody ? "on" : ""}`} role={phoneInBody ? "alert" : undefined}>
                <Icon name="info" size={16} />
                {phoneInBody
                  ? "본문에 전화번호가 있어요. 공개 화면에서는 가려지지만, 연락처는 본문 대신 연락처 칸을 이용해 주세요."
                  : "본문에 연락처를 쓰지 말고 연락처 칸을 이용하세요."}
              </p>
              {hasLink && <p className="qna-tip on"><Icon name="info" size={16} />링크가 들어 있는 글은 담아가넷이 확인한 뒤 공개돼요.</p>}

              <label className="qna-secret">
                <input type="checkbox" checked={f.isSecret} onChange={(e) => set("isSecret", e.target.checked)} />
                <span><Icon name="lock" size={16} /> <b>비밀글</b> — 작성자와 담아가넷만 내용을 볼 수 있어요 (목록에는 제목만 보여요)</span>
              </label>

              {!editing && (
                <>
                  <div className="hp" aria-hidden="true">
                    <label>웹사이트<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" /></label>
                  </div>
                  <div className="consent">
                    <label className="consent-check">
                      <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} aria-invalid={!!errors.consent} />
                      <span><b>[필수]</b> 개인정보 수집·이용에 동의합니다.</span>
                    </label>
                    <button type="button" className="consent-toggle" aria-expanded={showConsent} onClick={() => setShowConsent((v) => !v)}>
                      {showConsent ? "닫기" : "내용 보기"}
                    </button>
                  </div>
                  {showConsent && <QnaConsentText />}
                  {errors.consent && <p className="err" style={{ marginTop: 0 }}>{errors.consent}</p>}
                  <Turnstile siteKey={turnstileSiteKey} onToken={setToken} resetKey={tsReset} />
                  {errors.turnstile && <p className="err">{errors.turnstile}</p>}
                </>
              )}

              {serverError && <p className="err" role="alert">{serverError}</p>}
              <div className="qna-form-btns">
                <Link to={editing ? `/support/qna/${editId}` : "/support/qna"} className="btn btn-lg">취소</Link>
                <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? "등록 중…" : editing ? "수정하기" : "질문 등록"}</button>
              </div>
            </form>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

function Field({ id, label, required, optional, error, wide, children }) {
  return (
    <div className={`field ${wide ? "qna-wide" : ""}`}>
      <label htmlFor={id}>{label} {required && <span className="qna-req">필수</span>}{optional && <span className="hint">(선택)</span>}</label>
      {children}
      {error && <p className="err" style={{ margin: 0 }}>{error}</p>}
    </div>
  );
}

function QnaConsentText() {
  const { business: b } = useSiteData();
  const contact = [b.privacyOfficerName, b.privacyOfficerEmail && `(${b.privacyOfficerEmail})`].filter(Boolean).join(" ");
  return (
    <div className="consent-text">
      <p><b>1. 수집 항목</b> 이름, 비밀번호(암호화 저장), 연락처(선택), 질문 제목·내용, 접속 정보(IP)</p>
      <p><b>2. 수집·이용 목적</b> 질문 답변, 연락처를 남긴 경우 상담 안내 전화, 비밀글 열람·글 수정·삭제 시 본인 확인, 부정 이용(스팸) 방지</p>
      <p><b>3. 보유·이용 기간</b> 글 삭제 시까지. 단, 관계 법령에 따라 보존할 필요가 있는 경우 해당 기간 동안 보관</p>
      <p><b>4. 동의 거부 권리</b> 동의를 거부할 수 있으며, 거부 시 질문 등록이 제한됩니다.</p>
      {contact && <p>문의: {contact}</p>}
      <p>자세한 내용은 <Link to="/privacy">개인정보처리방침</Link>을 확인하세요.</p>
    </div>
  );
}
