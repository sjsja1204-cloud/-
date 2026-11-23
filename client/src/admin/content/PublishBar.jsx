import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { fmtDateTime } from "../../lib/format";

/** 편집 화면 상단: 상태 표시 + [임시저장] [미리보기] [사이트에 반영하기] [이전 버전] */
export default function PublishBar({ ed, contentKey, previewPath, label }) {
  const [showVersions, setShowVersions] = useState(false);
  const [showIssues, setShowIssues] = useState(false);
  const { meta, dirty, busy, issues, serverIssues, msg } = ed;
  if (!meta) return null;

  const state = dirty
    ? { cls: "warn", text: "저장하지 않은 변경이 있어요" }
    : meta.has_unpublished
      ? { cls: "info", text: "임시저장됨 · 아직 사이트에 반영 안 됨" }
      : { cls: "ok", text: "사이트에 반영된 내용과 같아요" };
  const allIssues = issues.length ? issues : serverIssues;

  const doPublish = () => {
    if (!confirm(`${label}을(를) 지금 사이트에 반영할까요?\n고객 화면에 바로 보입니다. 잘못되면 '이전 버전'에서 되돌릴 수 있어요.`)) return;
    ed.publish();
  };

  return (
    <div className="pubbar">
      <div className="pubbar-row">
        <span className={`pubbar-state ${state.cls}`}>{state.text}</span>
        <span className="hint pubbar-time">마지막 반영 {fmtDateTime(meta.published_at)}</span>
        <span className="spacer" />
        <button className="btn btn-sm" onClick={() => setShowVersions(true)}>이전 버전</button>
        {dirty && <button className="btn btn-sm" disabled={busy} onClick={() => confirm("저장하지 않은 변경을 버리고 임시저장된 내용으로 돌아갈까요?") && ed.discard()}>변경 취소</button>}
        <button className="btn btn-sm" disabled={busy || !dirty} onClick={ed.saveDraft}>임시저장</button>
        <button className="btn btn-sm" disabled={busy} onClick={() => ed.preview(previewPath)}>미리보기</button>
        <button className="btn btn-sm btn-primary" disabled={busy || issues.length > 0 || (!dirty && !meta.has_unpublished)} onClick={doPublish}
          title={issues.length ? "고쳐야 할 항목이 있어 반영할 수 없어요" : ""}>
          사이트에 반영하기
        </button>
      </div>
      {allIssues.length > 0 && (
        <div className="alert alert-err pubbar-issues">
          <button className="linkish" onClick={() => setShowIssues(!showIssues)}>
            고쳐야 할 곳이 {allIssues.length}개 있어 사이트에 반영할 수 없어요. {showIssues ? "접기 ▲" : "보기 ▼"}
          </button>
          {showIssues && (
            <ul>{allIssues.slice(0, 30).map((it, i) => <li key={i}><b>{it.where}</b> — {it.message}</li>)}</ul>
          )}
        </div>
      )}
      {msg && <div className={`alert ${msg.err ? "alert-err" : "alert-ok"}`} onClick={() => ed.setMsg(null)}>{msg.text}</div>}
      {showVersions && <VersionsDrawer contentKey={contentKey} ed={ed} label={label} onClose={() => setShowVersions(false)} />}
    </div>
  );
}

function VersionsDrawer({ contentKey, ed, label, onClose }) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    api(`/admin/content/${contentKey}/versions`).then((d) => setItems(d.items)).catch(() => setItems([]));
  }, [contentKey, ed.meta?.published_at]);

  const revert = async (v, idx) => {
    if (idx === 0) return;
    const when = fmtDateTime(v.published_at);
    if (!confirm(`${label}을(를) ${when} 버전으로 되돌릴까요?\n고객 화면이 바로 그때 내용으로 바뀝니다. 지금 편집 중인 내용은 사라져요.`)) return;
    if (await ed.revert(v.id)) onClose();
  };

  return (
    <div className="drawer-dim" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <b>{label} 이전 버전</b>
          <button className="btn btn-sm" onClick={onClose}>닫기</button>
        </div>
        <div className="drawer-body">
          <p className="hint">사이트에 반영할 때마다 그때 내용이 저장됩니다 (최근 30개). 되돌리면 고객 화면이 바로 그 버전으로 바뀝니다.</p>
          {!items ? <p className="hint">불러오는 중…</p> : (
            <ul className="ver-list">
              {items.map((v, i) => (
                <li key={v.id}>
                  <div>
                    <b>{fmtDateTime(v.published_at)}</b> {i === 0 && <span className="badge badge-accent">지금 사이트</span>}
                    <div className="hint">{v.published_by_name || "시스템"}{v.note ? ` · ${v.note}` : ""}</div>
                  </div>
                  {i > 0 && <button className="btn btn-sm" disabled={ed.busy} onClick={() => revert(v, i)}>이 버전으로 되돌리기</button>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
