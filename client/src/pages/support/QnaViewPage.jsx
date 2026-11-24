import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import SiteLayout from "../../components/site/SiteLayout";
import PageHero from "../../components/site/PageHero";
import Icon from "../../components/site/Icon";
import { api } from "../../lib/api";
import { useSiteData } from "../../lib/siteData";
import { QNA_STATUS_LABEL, fmtQnaDate } from "../../lib/qna";
import { csTabs } from "./csTabs";
import "./qna.css";

/**
 * 질문 보기 (/support/qna/:id)
 * 비밀글은 비밀번호 확인 후 열람(관리자는 바로). 작성자는 비밀번호로 수정(답변 전)·삭제.
 */
export default function QnaViewPage() {
  const { id } = useParams();
  const { state, pathname } = useLocation();
  const nav = useNavigate();
  const { openConsult, business } = useSiteData();
  const [post, setPost] = useState(null);
  const [error, setError] = useState("");
  const [pw, setPw] = useState(state?.password || ""); // 이 화면에서 확인한 비밀번호 (수정·삭제에 다시 씀)
  const [ask, setAsk] = useState(null); // null | "unlock" | "edit" | "delete"
  const [justWritten] = useState(!!state?.justWritten);

  // 작성·수정 직후 넘어온 비밀번호는 기록(history)에 남기지 않음
  useEffect(() => {
    if (state?.password) nav(pathname, { replace: true, state: null });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    setError("");
    try {
      const d = await api(`/public/qna/${id}`);
      if (d.post.locked && pw) {
        try {
          setPost((await api(`/public/qna/${id}/unlock`, { method: "POST", body: { password: pw } })).post);
          return;
        } catch {
          setPw("");
        }
      }
      setPost(d.post);
    } catch (e) {
      setError(e.message);
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const onPassword = async (password) => {
    if (ask === "delete") {
      await api(`/public/qna/${id}`, { method: "DELETE", body: { password } });
      nav("/support/qna", { replace: true });
      return;
    }
    const d = await api(`/public/qna/${id}/unlock`, { method: "POST", body: { password } });
    setPw(password);
    setPost(d.post);
    if (ask === "edit") goEdit(d.post, password);
    setAsk(null);
  };
  const goEdit = (p, password) => nav(`/support/qna/write?edit=${id}`, { state: { post: { id: p.id, title: p.title, content: p.content, isSecret: p.isSecret }, password } });
  const remove = async () => {
    if (!pw) return setAsk("delete");
    if (!confirm("이 글을 삭제할까요? 삭제하면 되돌릴 수 없어요.")) return;
    try {
      await api(`/public/qna/${id}`, { method: "DELETE", body: { password: pw } });
      nav("/support/qna", { replace: true });
    } catch (e) {
      alert(e.message);
    }
  };

  const locked = post?.locked;
  const mine = !post?.isNotice;
  return (
    <SiteLayout title={post && !locked ? post.title : "질문/답변"}>
      <PageHero title="고객센터" crumbs={[["고객센터", "/support"], ["질문/답변", "/support/qna"], ["글 보기"]]} tabs={csTabs} />
      <section className="sec">
        <div className="site-inner narrow">
          {error && <div className="empty-box">{error}<p><Link to="/support/qna" className="btn" style={{ marginTop: 14 }}>목록으로</Link></p></div>}
          {!post && !error && <div className="empty-box">불러오는 중…</div>}
          {post && (
            <article className="qna-view">
              {justWritten && <p className="qna-flash" role="status"><Icon name="check" size={18} /> 질문이 등록되었습니다. 답변이 달리면 이 글에서 확인할 수 있어요.</p>}
              <header className="qna-view-head">
                <p className="qna-view-badges">
                  {post.isNotice ? <span className="qna-badge notice">공지</span>
                    : <span className={`qna-badge ${post.status === "answered" ? "done" : "wait"}`}>{QNA_STATUS_LABEL[post.status]}</span>}
                  {post.isSecret && <span className="qna-badge secret"><Icon name="lock" size={13} /> 비밀글</span>}
                </p>
                <h2>{post.title}</h2>
                <p className="qna-view-meta">
                  <span>{post.author}</span><span>{fmtQnaDate(post.date)}</span><span>조회 {post.views.toLocaleString("ko-KR")}</span>
                </p>
              </header>

              {locked ? (
                ask === "unlock" || ask === "delete" ? (
                  <PasswordBox mode={ask} onSubmit={onPassword} onCancel={() => setAsk(null)} />
                ) : (
                  <div className="qna-locked">
                    <Icon name="lock" size={30} />
                    <p><b>비밀글입니다.</b><br />작성자와 담아가넷만 볼 수 있어요.</p>
                    <button type="button" className="btn btn-primary" onClick={() => setAsk("unlock")}>비밀번호 입력</button>
                  </div>
                )
              ) : (
                <>
                  <div className="qna-view-body">{post.content}</div>
                  {post.answers.map((a) => (
                    <section key={a.id} className="qna-answer" aria-label="담아가넷 답변">
                      <p className="qna-answer-head"><span className="qna-answer-mark">A</span><b>{business.name || "담아가넷"} 답변</b><span>{fmtQnaDate(a.date)}</span></p>
                      <div className="qna-answer-body">{a.content}</div>
                    </section>
                  ))}
                  {!post.isNotice && !post.answers.length && (
                    <p className="qna-waiting"><Icon name="clock" size={18} /> 담아가넷이 확인 후 답변드릴게요. 급하시면 상담 신청을 이용해 주세요.</p>
                  )}
                  {(ask === "edit" || ask === "delete") && <PasswordBox mode={ask} onSubmit={onPassword} onCancel={() => setAsk(null)} />}
                </>
              )}

              <div className="qna-view-btns">
                <Link to="/support/qna" className="btn">목록</Link>
                <span className="spacer" />
                {mine && !locked && post.canEdit && (
                  <button type="button" className="btn" onClick={() => (pw ? goEdit(post, pw) : setAsk("edit"))}>수정</button>
                )}
                {mine && <button type="button" className="btn" onClick={remove}>삭제</button>}
              </div>
              {mine && !locked && !post.canEdit && post.answers.length > 0 && <p className="hint qna-noedit">답변이 달린 글은 수정할 수 없고 삭제만 할 수 있어요.</p>}

              <div className="cs-cta qna-cta">
                <p>답변을 기다리기보다 바로 안내받고 싶다면, 상담 신청을 남겨 주세요.</p>
                <button type="button" className="btn btn-primary btn-lg" onClick={() => openConsult("consult")}>상담 신청하기</button>
              </div>
            </article>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

const MODE_TEXT = {
  unlock: ["비밀번호 확인", "글을 쓸 때 입력한 비밀번호를 넣어 주세요.", "확인"],
  edit: ["글 수정", "수정하려면 글을 쓸 때 입력한 비밀번호를 넣어 주세요.", "수정하기"],
  delete: ["글 삭제", "삭제하면 되돌릴 수 없어요. 글을 쓸 때 입력한 비밀번호를 넣어 주세요.", "삭제하기"],
};

function PasswordBox({ mode, onSubmit, onCancel }) {
  const [v, setV] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [title, desc, btn] = MODE_TEXT[mode];
  const submit = async (e) => {
    e.preventDefault();
    if (!v) return setErr("비밀번호를 입력하세요.");
    setBusy(true);
    setErr("");
    try {
      await onSubmit(v);
    } catch (er) {
      setErr(er.message);
      setBusy(false);
    }
  };
  return (
    <form className="qna-pw" onSubmit={submit}>
      <b>{title}</b>
      <p className="hint">{desc}</p>
      <div className="qna-pw-row">
        <input type="password" className="input" value={v} maxLength={50} autoFocus autoComplete="current-password" aria-label="비밀번호"
          onChange={(e) => setV(e.target.value)} />
        <button className={`btn ${mode === "delete" ? "btn-dark" : "btn-primary"}`} disabled={busy}>{btn}</button>
        <button type="button" className="btn" onClick={onCancel}>취소</button>
      </div>
      {err && <p className="err" role="alert">{err}</p>}
    </form>
  );
}
