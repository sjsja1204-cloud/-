import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, qs } from "../lib/api";
import { fmtDateTime, hyphenPhone } from "../lib/format";
import "./qna-admin.css";

export const QNA_STATUS = { waiting: "답변대기", answered: "답변완료", review: "검토중", hidden: "숨김" };
const FILTERS = [["", "전체"], ["waiting", "답변대기"], ["answered", "답변완료"], ["review", "검토중"], ["hidden", "숨김"], ["notice", "공지"]];

/**
 * 관리자·직원: 질문/답변 (/admin/qna, /staff/qna)
 * 직원(admin=false)은 관리자 설정에서 답변 권한을 켰을 때만 — 목록·보기·답변 작성/수정만, 연락처는 가려서 보임
 */
export default function QnaAdminPage({ admin = true }) {
  const base = admin ? "/admin/qna" : "/staff/qna";
  const [sp, setSp] = useSearchParams();
  const [tab, setTab] = useState("list");
  const [f, setF] = useState({ status: "", secret: "", q: "", page: 1 });
  const [qInput, setQInput] = useState("");
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState(null);
  const [notice, setNotice] = useState(null); // 공지 작성·수정 폼
  const openId = Number(sp.get("id")) || null;

  const load = useCallback(() => api(`${base}${qs(f)}`).then(setData).catch((e) => setMsg({ err: true, text: e.message })), [base, f]);
  useEffect(() => { load(); }, [load]);

  const open = (id) => setSp(id ? { id: String(id) } : {});
  const setFilter = (patch) => setF((x) => ({ ...x, page: 1, ...patch }));

  return (
    <div>
      <h2 className="page-title">질문/답변</h2>
      {admin && (
        <div className="toolbar">
          {[["list", "글 목록"], ["guard", "차단 IP · 금지어 · 권한"]].map(([k, l]) => (
            <button key={k} className={`btn btn-sm ${tab === k ? "btn-dark" : ""}`} onClick={() => setTab(k)}>{l}</button>
          ))}
          <span className="spacer" />
          <button className="btn btn-sm btn-primary" onClick={() => { setTab("list"); setNotice({ title: "", content: "", isSecret: false }); }}>+ 공지 쓰기</button>
        </div>
      )}
      {msg && <div className={`alert ${msg.err ? "alert-err" : "alert-ok"}`} onClick={() => setMsg(null)}>{msg.text}</div>}

      {tab === "guard" && admin ? <GuardPanel setMsg={setMsg} /> : (
        <>
          {notice && <NoticeForm value={notice} onClose={() => setNotice(null)} onSaved={(t) => { setNotice(null); setMsg({ text: t }); load(); }} setMsg={setMsg} />}
          <div className="toolbar">
            {FILTERS.map(([k, l]) => (
              <button key={k || "all"} className={`btn btn-sm ${f.status === k ? "btn-dark" : ""}`} onClick={() => setFilter({ status: k })}>
                {l}{k && data?.counts ? ` (${data.counts[k] || 0})` : ""}
              </button>
            ))}
            <span className="spacer" />
            <select className="select qa-sel" value={f.secret} onChange={(e) => setFilter({ secret: e.target.value })} aria-label="비밀글 여부">
              <option value="">비밀글 전체</option><option value="1">비밀글만</option><option value="0">공개글만</option>
            </select>
            <form className="qa-search" onSubmit={(e) => { e.preventDefault(); setFilter({ q: qInput.trim() }); }}>
              <input className="input" value={qInput} maxLength={50} placeholder={admin ? "제목·내용·작성자·연락처" : "제목·내용·작성자"} onChange={(e) => setQInput(e.target.value)} />
              <button className="btn btn-sm">검색</button>
            </form>
          </div>

          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>번호</th><th>상태</th><th>제목</th><th>작성자</th>{admin && <th>연락처</th>}<th className="num">답변</th><th className="num">조회</th><th>작성</th></tr></thead>
              <tbody>
                {data?.items.map((p) => (
                  <tr key={p.id} className={`clickable ${openId === p.id ? "selected" : ""}`} onClick={() => open(p.id)}>
                    <td className="nowrap muted">{p.id}</td>
                    <td className="nowrap"><StatusBadge p={p} /></td>
                    <td className="ellipsis" style={{ maxWidth: 420 }}>{p.is_secret && <span title="비밀글" aria-label="비밀글">🔒 </span>}<b>{p.title}</b></td>
                    <td className="nowrap">{p.author_name}</td>
                    {admin && <td className="nowrap">{p.phone ? hyphenPhone(p.phone) : <span className="muted">-</span>}{p.lead_id && <span className="badge badge-accent" style={{ marginLeft: 4 }}>DB #{p.lead_id}</span>}</td>}
                    <td className="num">{p.answer_count}</td>
                    <td className="num">{p.view_count}</td>
                    <td className="nowrap muted">{fmtDateTime(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data && !data.items.length && <div className="tbl-empty">글이 없습니다.</div>}
          </div>
          {data && data.total > data.pageSize && (
            <div className="pager">
              <button className="btn btn-sm" disabled={f.page <= 1} onClick={() => setF({ ...f, page: f.page - 1 })}>이전</button>
              <span>{f.page} / {Math.ceil(data.total / data.pageSize)}</span>
              <button className="btn btn-sm" disabled={f.page >= Math.ceil(data.total / data.pageSize)} onClick={() => setF({ ...f, page: f.page + 1 })}>다음</button>
            </div>
          )}
        </>
      )}

      {openId && (
        <PostDrawer id={openId} base={base} admin={admin} onClose={() => open(null)} onChanged={load} setMsg={setMsg}
          onEditNotice={(p) => { open(null); setTab("list"); setNotice({ id: p.id, title: p.title, content: p.content, isSecret: p.is_secret }); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
      )}
    </div>
  );
}

function StatusBadge({ p }) {
  if (p.is_notice) return <span className="badge qa-b-notice">공지</span>;
  return <span className={`badge qa-b-${p.status}`}>{QNA_STATUS[p.status]}</span>;
}

/** 글 상세 (오른쪽 패널): 본문 · 답변 · 관리 버튼 */
function PostDrawer({ id, base, admin, onClose, onChanged, setMsg, onEditNotice }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [answer, setAnswer] = useState("");
  const [editing, setEditing] = useState(null); // { id, content }
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api(`${base}/${id}`).then(setD).catch((e) => setErr(e.message)), [base, id]);
  useEffect(() => { setD(null); setErr(""); setAnswer(""); setEditing(null); load(); }, [load]);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const run = async (fn, ok, close = false) => {
    setBusy(true);
    try {
      const r = await fn();
      if (ok) setMsg({ text: typeof ok === "function" ? ok(r) : ok });
      onChanged();
      if (close) onClose(); else await load();
      return true;
    } catch (e) {
      setMsg({ err: true, text: e.message });
      return false;
    } finally {
      setBusy(false);
    }
  };
  const post = (path, body) => api(`${base}/${id}${path}`, { method: "POST", body });

  const p = d?.post;
  return (
    <>
      <div className="drawer-dim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="질문 상세">
        <div className="drawer-head">
          <h3>질문 #{id}</h3>
          <button className="btn btn-sm" onClick={onClose}>닫기</button>
        </div>
        <div className="drawer-body">
          {err && <div className="alert alert-err">{err}</div>}
          {!p ? !err && <p className="hint">불러오는 중…</p> : (
            <>
              <section>
                <p className="qa-d-badges"><StatusBadge p={p} />{p.is_secret && <span className="badge">🔒 비밀글</span>}</p>
                <h4 className="qa-d-title">{p.title}</h4>
                <dl className="kv">
                  <dt>작성자</dt><dd>{p.author_name}</dd>
                  <dt>연락처</dt><dd>{p.phone ? hyphenPhone(p.phone) : "남기지 않음"}{admin && p.phone_leads > 0 && !p.lead_id && <span className="badge badge-dup" style={{ marginLeft: 6 }}>접수 DB에 같은 번호 {p.phone_leads}건</span>}</dd>
                  <dt>작성일</dt><dd>{fmtDateTime(p.created_at)}{p.updated_at && p.updated_at !== p.created_at ? ` (수정 ${fmtDateTime(p.updated_at)})` : ""}</dd>
                  <dt>조회</dt><dd>{p.view_count}</dd>
                  {admin && <><dt>작성 IP</dt><dd>{p.ip || "-"}</dd></>}
                  {p.lead_id && <><dt>접수 DB</dt><dd>#{p.lead_id} 로 등록됨</dd></>}
                </dl>
                <div className="qa-d-body">{p.content}</div>
              </section>

              {admin && (
                <section className="qa-actions">
                  {p.status === "review" && <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => run(() => post("/approve"), "승인했습니다. 홈페이지에 공개됩니다.")}>승인 (공개)</button>}
                  {p.status === "hidden"
                    ? <button className="btn btn-sm" disabled={busy} onClick={() => run(() => post("/unhide"), "숨김을 해제했습니다.")}>숨김 해제</button>
                    : <button className="btn btn-sm" disabled={busy} onClick={() => run(() => post("/hide"), "숨겼습니다. 홈페이지에서 보이지 않아요.")}>숨기기</button>}
                  <button className="btn btn-sm" disabled={busy} onClick={() => run(() => api(`${base}/${id}/notice`, { method: "PUT", body: { isNotice: !p.is_notice } }), p.is_notice ? "공지 고정을 해제했습니다." : "목록 맨 위에 공지로 고정했습니다.")}>
                    {p.is_notice ? "공지 고정 해제" : "공지로 고정"}
                  </button>
                  {p.author_id && <button className="btn btn-sm" onClick={() => onEditNotice(p)}>공지 수정</button>}
                  {p.phone && !p.lead_id && (
                    <button className="btn btn-sm" disabled={busy}
                      onClick={() => confirm(`${p.author_name} 님(${hyphenPhone(p.phone)})을 접수 DB에 등록할까요?`) && run(() => post("/lead"), (r) => `접수 DB #${r.leadId} 로 등록했습니다.${r.duplicate ? " (같은 번호가 이미 있어 '중복'으로 표시돼요)" : ""}`)}>
                      접수 DB로 등록
                    </button>
                  )}
                  {p.ip && <button className="btn btn-sm" disabled={busy} onClick={() => confirm(`작성 IP ${p.ip} 를 차단할까요? 이 IP 에서는 새 글을 쓸 수 없어요.`) && run(() => post("/block-ip"), (r) => `${r.ip} 를 차단했습니다.`)}>IP 차단</button>}
                  <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => confirm("이 글과 답변을 삭제할까요? 되돌릴 수 없습니다.") && run(() => api(`${base}/${id}`, { method: "DELETE" }), "삭제했습니다.", true)}>삭제</button>
                </section>
              )}

              <section>
                <h4>담아가넷 답변 ({d.answers.length})</h4>
                <ul className="notes">
                  {d.answers.map((a) => (
                    <li key={a.id}>
                      <span className="meta">{a.user_name || "관리자"} · {fmtDateTime(a.created_at)}{a.updated_at !== a.created_at ? " (수정됨)" : ""}</span>
                      {editing?.id === a.id ? (
                        <form onSubmit={(e) => { e.preventDefault(); run(() => api(`${base}/answers/${a.id}`, { method: "PUT", body: { content: editing.content } }), "답변을 수정했습니다.").then((ok) => ok && setEditing(null)); }}>
                          <textarea className="textarea" rows={5} value={editing.content} maxLength={5000} onChange={(e) => setEditing({ ...editing, content: e.target.value })} />
                          <div className="toolbar" style={{ margin: "6px 0 0" }}><span className="spacer" />
                            <button type="button" className="btn btn-sm" onClick={() => setEditing(null)}>취소</button>
                            <button className="btn btn-sm btn-primary" disabled={busy || !editing.content.trim()}>저장</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          {a.content}
                          <span className="qa-a-tools">
                            <button className="btn btn-sm" onClick={() => setEditing({ id: a.id, content: a.content })}>수정</button>
                            {admin && <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => confirm("이 답변을 삭제할까요?") && run(() => api(`${base}/answers/${a.id}`, { method: "DELETE" }), "답변을 삭제했습니다.")}>삭제</button>}
                          </span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
                {!p.is_notice && (
                  <form className="qa-answer-form" onSubmit={(e) => { e.preventDefault(); run(() => post("/answers", { content: answer }), "답변을 등록했습니다. 상태가 '답변완료'로 바뀌어요.").then((ok) => ok && setAnswer("")); }}>
                    <textarea className="textarea" rows={6} value={answer} maxLength={5000} placeholder="답변 내용 (줄바꿈 그대로 홈페이지에 표시)" onChange={(e) => setAnswer(e.target.value)} />
                    <div className="toolbar" style={{ margin: "6px 0 0" }}>
                      <span className="hint">{p.status === "review" ? "검토중 글은 승인해야 홈페이지에 공개돼요." : ""}</span>
                      <span className="spacer" />
                      <button className="btn btn-sm btn-primary" disabled={busy || !answer.trim()}>답변 등록</button>
                    </div>
                  </form>
                )}
              </section>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function NoticeForm({ value, onClose, onSaved, setMsg }) {
  const [f, setF] = useState(value);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (f.id) await api(`/admin/qna/${f.id}`, { method: "PUT", body: { title: f.title, content: f.content, isSecret: f.isSecret } });
      else await api("/admin/qna/notices", { method: "POST", body: { title: f.title, content: f.content, isSecret: f.isSecret } });
      onSaved(f.id ? "공지를 수정했습니다." : "공지를 등록했습니다. 질문/답변 목록 맨 위에 보여요.");
    } catch (er) {
      setMsg({ err: true, text: er.message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="card" style={{ marginBottom: 12, display: "grid", gap: 10 }} onSubmit={submit}>
      <b>{f.id ? "공지 수정" : "새 공지"}</b>
      <label className="field" style={{ margin: 0 }}>
        <span className="field-label">제목</span>
        <input className="input" value={f.title} maxLength={100} required onChange={(e) => setF({ ...f, title: e.target.value })} />
      </label>
      <label className="field" style={{ margin: 0 }}>
        <span className="field-label">내용 <span className="hint">(줄바꿈 그대로 표시)</span></span>
        <textarea className="textarea" rows={6} value={f.content} maxLength={5000} required onChange={(e) => setF({ ...f, content: e.target.value })} />
      </label>
      <div className="toolbar" style={{ margin: 0 }}>
        <span className="spacer" />
        <button type="button" className="btn btn-sm" onClick={onClose}>취소</button>
        <button className="btn btn-sm btn-primary" disabled={busy}>저장</button>
      </div>
    </form>
  );
}

/** 차단 IP · 금지어 · 직원 답변 권한 */
function GuardPanel({ setMsg }) {
  const [blocked, setBlocked] = useState(null);
  const [setting, setSetting] = useState(null);
  const [words, setWords] = useState("");
  const [ip, setIp] = useState({ ip: "", reason: "" });

  const loadBlocked = useCallback(() => api("/admin/qna/blocked").then((d) => setBlocked(d.items)), []);
  const loadSetting = useCallback(() => api("/admin/settings").then((d) => { setSetting(d.qna); setWords((d.qna.bannedWords || []).join("\n")); }), []);
  useEffect(() => { loadBlocked().catch((e) => setMsg({ err: true, text: e.message })); loadSetting().catch(() => {}); }, [loadBlocked, loadSetting, setMsg]);

  const saveSetting = async (patch, ok) => {
    try {
      await api("/admin/settings/qna", { method: "PUT", body: { ...setting, ...patch } });
      setMsg({ text: ok });
      await loadSetting();
    } catch (e) {
      setMsg({ err: true, text: e.message });
    }
  };
  const run = async (fn, ok) => {
    try {
      await fn();
      setMsg({ text: ok });
      await loadBlocked();
      return true;
    } catch (e) {
      setMsg({ err: true, text: e.message });
      return false;
    }
  };

  return (
    <div className="qa-guard">
      <div className="card">
        <b>직원 답변 권한</b>
        <p className="hint">켜면 직원 화면에 '질문/답변' 메뉴가 생기고 답변을 쓰고 고칠 수 있어요. 숨기기·삭제·IP 차단·접수 DB 등록은 관리자만 할 수 있고, 직원에게는 연락처가 가려져 보여요.</p>
        {setting && (
          <label className="toggle">
            <input type="checkbox" checked={setting.staffAnswer} onChange={(e) => saveSetting({ staffAnswer: e.target.checked }, e.target.checked ? "직원 답변 권한을 켰습니다." : "직원 답변 권한을 껐습니다.")} />
            <span>{setting.staffAnswer ? "켜짐" : "꺼짐 (기본)"}</span>
          </label>
        )}
      </div>

      <form className="card" onSubmit={(e) => { e.preventDefault(); saveSetting({ bannedWords: words.split("\n").map((s) => s.trim()).filter(Boolean) }, "금지어를 저장했습니다."); }}>
        <b>금지어</b>
        <p className="hint">한 줄에 하나씩. 이름·제목·내용에 들어 있으면 글 등록·수정이 막혀요 (띄어쓰기·대소문자 무시).</p>
        <textarea className="textarea" rows={8} value={words} onChange={(e) => setWords(e.target.value)} placeholder={"예:\n도박\n대출"} />
        <div className="toolbar" style={{ margin: "8px 0 0" }}><span className="spacer" /><button className="btn btn-sm btn-primary" disabled={!setting}>저장</button></div>
      </form>

      <div className="card">
        <b>차단 IP</b>
        <p className="hint">차단한 IP 에서는 질문/답변 글을 쓸 수 없어요. 글 상세의 'IP 차단' 버튼으로도 추가돼요.</p>
        <form className="qa-ipform" onSubmit={(e) => { e.preventDefault(); run(() => api("/admin/qna/blocked", { method: "POST", body: ip }), `${ip.ip} 를 차단했습니다.`).then((ok) => ok && setIp({ ip: "", reason: "" })); }}>
          <input className="input" value={ip.ip} maxLength={64} placeholder="IP (예: 203.0.113.7)" onChange={(e) => setIp({ ...ip, ip: e.target.value })} />
          <input className="input" value={ip.reason} maxLength={200} placeholder="사유 (선택)" onChange={(e) => setIp({ ...ip, reason: e.target.value })} />
          <button className="btn btn-sm" disabled={!ip.ip.trim()}>+ 차단</button>
        </form>
        <ul className="qa-iplist">
          {blocked?.map((b) => (
            <li key={b.id}>
              <b>{b.ip}</b><span className="hint">{b.reason}</span><span className="hint">{fmtDateTime(b.created_at)}</span>
              <button className="btn btn-sm" onClick={() => confirm(`${b.ip} 차단을 해제할까요?`) && run(() => api(`/admin/qna/blocked/${b.id}`, { method: "DELETE" }), "차단을 해제했습니다.")}>해제</button>
            </li>
          ))}
          {blocked && !blocked.length && <li className="hint">차단한 IP 가 없습니다.</li>}
        </ul>
      </div>
    </div>
  );
}
