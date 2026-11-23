import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useSiteData } from "../lib/siteData";
import { clearStatusCache } from "../components/panel/hooks";
import { Field, ItemTools } from "./content/bits";
import { moveItem, removeAt, setAt } from "./content/useContentEditor";
import "./content/editor.css";

const BUSINESS_FIELDS = [
  ["name", "상호", "담아가넷"],
  ["ceo", "대표자"],
  ["phone", "대표번호 (있으면 전화 버튼이 생겨요)", "02-000-0000"],
  ["email", "이메일"],
  ["hours", "상담 운영시간", "예: 평일 09:00~18:00 (주말·공휴일 휴무)"],
  ["address", "주소", "", true],
  ["bizNumber", "사업자등록번호", "000-00-00000"],
  ["ecommerceNumber", "통신판매업 신고번호", "제0000-서울00-0000호"],
  ["privacyOfficerName", "개인정보 보호책임자 이름"],
  ["privacyOfficerEmail", "개인정보 보호책임자 이메일"],
];

/** 관리자: 사이트 설정 (저장 즉시 반영) */
export default function SettingsPage() {
  const [tab, setTab] = useState("business");
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState(null);
  const site = useSiteData();

  const load = useCallback(() => api("/admin/settings").then(setData).catch((e) => setMsg({ err: true, text: e.message })), []);
  useEffect(() => { load(); }, [load]);

  const save = async (key, value) => {
    setMsg(null);
    try {
      await api(`/admin/settings/${key}`, { method: "PUT", body: value });
      setMsg({ text: "저장했습니다. 고객 화면에 바로 적용됩니다." });
      await load();
      site.reload();
      return true;
    } catch (e) {
      setMsg({ err: true, text: e.message });
      return false;
    }
  };

  return (
    <div className="editor-page">
      <h2 className="page-title">사이트 설정</h2>
      <p className="page-desc">여기서 바꾼 내용은 <b>저장하는 즉시</b> 홈페이지에 반영됩니다. 빈칸으로 두면 홈페이지에 표시하지 않아요.</p>
      <div className="etabs">
        {[["business", "사업자 정보"], ["form", "상담 폼 선택지"], ["status", "상담 상태값"], ["telegram", "알림"]].map(([k, l]) => (
          <button key={k} type="button" className={tab === k ? "on" : ""} onClick={() => { setTab(k); setMsg(null); }}>{l}</button>
        ))}
      </div>
      {msg && <div className={`alert ${msg.err ? "alert-err" : "alert-ok"}`} onClick={() => setMsg(null)}>{msg.text}</div>}
      {!data ? <p className="hint">불러오는 중…</p> : (
        <>
          {tab === "business" && <BusinessForm value={data.business} onSave={(v) => save("business", v)} />}
          {tab === "form" && <OptionsForm value={data.form_options} onSave={(v) => save("form_options", v)} />}
          {tab === "status" && <StatusEditor setMsg={setMsg} />}
          {tab === "telegram" && <TelegramForm value={data.telegram} env={data.env} onSave={(v) => save("telegram", v)} />}
        </>
      )}
    </div>
  );
}

function BusinessForm({ value, onSave }) {
  const [f, setF] = useState(value);
  useEffect(() => setF(value), [value]);
  return (
    <form className="card ecard-body" onSubmit={(e) => { e.preventDefault(); onSave(f); }}>
      <p className="hint">푸터, 개인정보처리방침, 이용약관, 전화 버튼에 쓰입니다.</p>
      <div className="efields">
        {BUSINESS_FIELDS.map(([k, label, ph, wide]) => (
          <Field key={k} label={label} wide={wide}>
            <input className="input" value={f[k] || ""} placeholder={ph || ""} maxLength={200} required={k === "name"}
              onChange={(e) => setF({ ...f, [k]: e.target.value })} />
          </Field>
        ))}
      </div>
      <div className="toolbar" style={{ margin: 0 }}><span className="spacer" /><button className="btn btn-primary">저장</button></div>
    </form>
  );
}

function OptionsForm({ value, onSave }) {
  const [f, setF] = useState(value);
  useEffect(() => setF(value), [value]);
  const list = (key, label, hint) => {
    const arr = f[key];
    const set = (v) => setF({ ...f, [key]: v });
    return (
      <div className="opt-col">
        <p className="efield-label">{label} <span className="hint">{hint}</span></p>
        {arr.map((v, i) => (
          <div key={i} className="opt-row">
            <input className="input" value={v} maxLength={30} onChange={(e) => set(setAt(arr, i, e.target.value))} />
            <ItemTools i={i} n={arr.length} onMove={(k, d) => set(moveItem(arr, k, d))} onRemove={arr.length > 1 ? (k) => set(removeAt(arr, k)) : null} />
          </div>
        ))}
        <button type="button" className="btn btn-sm" disabled={arr.length >= 20} onClick={() => set([...arr, ""])}>+ 추가</button>
      </div>
    );
  };
  const bad = [...f.products, ...f.carriers].some((v) => !v.trim());
  return (
    <form className="card ecard-body" onSubmit={(e) => { e.preventDefault(); onSave({ products: f.products.map((s) => s.trim()), carriers: f.carriers.map((s) => s.trim()) }); }}>
      <p className="hint">고객 상담 폼과 직원 직접 접수 화면의 선택 버튼입니다. 바꾸거나 지워도 <b>이미 접수된 DB 의 값은 그대로</b> 남아요.</p>
      <div className="opt-grid">
        {list("products", "관심 상품", "(여러 개 선택 가능)")}
        {list("carriers", "희망 통신사", "(하나만 선택)")}
      </div>
      {bad && <span className="err">빈 항목이 있어요.</span>}
      <div className="toolbar" style={{ margin: 0 }}><span className="spacer" /><button className="btn btn-primary" disabled={bad}>저장</button></div>
    </form>
  );
}

function StatusEditor({ setMsg }) {
  const [items, setItems] = useState(null);
  const [newName, setNewName] = useState("");
  const load = useCallback(() => api("/admin/settings/statuses").then((d) => setItems(d.items)), []);
  useEffect(() => { load(); }, [load]);
  const run = async (fn, ok) => {
    try {
      await fn();
      clearStatusCache();
      setMsg({ text: ok });
      await load();
    } catch (e) {
      setMsg({ err: true, text: e.message });
    }
  };
  const update = (s, patch) => {
    const next = { name: s.name, isFinal: s.is_final, isHidden: s.is_hidden, ...patch };
    return run(() => api(`/admin/settings/statuses/${s.id}`, { method: "PUT", body: next }), "저장했습니다.");
  };
  const rename = (s) => {
    const name = prompt("새 상태 이름", s.name);
    if (name && name.trim() !== s.name) update(s, { name: name.trim() });
  };
  if (!items) return <p className="hint">불러오는 중…</p>;
  return (
    <div className="card ecard-body">
      <p className="hint">직원이 누르는 상태 버튼입니다. <b>이미 쓰인 상태는 삭제할 수 없고 숨기기만</b> 할 수 있어요 (숨기면 새로 고를 수 없지만, 기존 DB 에는 그대로 보여요).</p>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>순서</th><th>이름</th><th>완료 상태</th><th>숨기기</th><th className="num">DB 수</th><th>관리</th></tr></thead>
          <tbody>
            {items.map((s, i) => (
              <tr key={s.id} style={{ opacity: s.is_hidden ? 0.55 : 1 }}>
                <td><ItemTools i={i} n={items.length} onMove={(k, d) => run(() => api("/admin/settings/statuses/order", { method: "POST", body: { ids: moveItem(items, k, d).map((x) => x.id) } }), "순서를 바꿨습니다.")} /></td>
                <td><b>{s.name}</b> {s.is_default && <span className="badge badge-accent">새 접수 기본</span>}</td>
                <td><label className="toggle"><input type="checkbox" checked={s.is_final} onChange={(e) => update(s, { isFinal: e.target.checked })} /><span>{s.is_final ? "완료" : "진행 중"}</span></label></td>
                <td><label className="toggle"><input type="checkbox" checked={s.is_hidden} disabled={s.is_default} onChange={(e) => update(s, { isHidden: e.target.checked })} /><span>{s.is_hidden ? "숨김" : "보임"}</span></label></td>
                <td className="num">{s.lead_count}</td>
                <td className="nowrap">
                  <button className="btn btn-sm" onClick={() => rename(s)}>이름 바꾸기</button>{" "}
                  {!s.is_default && s.lead_count === 0 && (
                    <button className="btn btn-sm btn-danger" onClick={() => confirm(`'${s.name}' 상태를 삭제할까요?`) && run(() => api(`/admin/settings/statuses/${s.id}`, { method: "DELETE" }), "삭제했습니다.")}>삭제</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form className="opt-row" onSubmit={(e) => { e.preventDefault(); if (newName.trim()) run(() => api("/admin/settings/statuses", { method: "POST", body: { name: newName.trim() } }), "상태를 추가했습니다.").then(() => setNewName("")); }}>
        <input className="input" value={newName} maxLength={20} placeholder="새 상태 이름 (예: 재통화)" onChange={(e) => setNewName(e.target.value)} />
        <button className="btn btn-sm" disabled={!newName.trim()}>+ 상태 추가</button>
      </form>
    </div>
  );
}

function TelegramForm({ value, env, onSave }) {
  const [chatId, setChatId] = useState(value.chatId || "");
  useEffect(() => setChatId(value.chatId || ""), [value]);
  return (
    <form className="card ecard-body" onSubmit={(e) => { e.preventDefault(); onSave({ chatId: chatId.trim() }); }}>
      <p className="hint">새 상담이 들어오면 텔레그램으로 알림을 보냅니다. 알림 받을 방의 Chat ID 를 넣으세요. (매뉴얼 '텔레그램 알림' 참고)</p>
      {!env.telegramToken && <div className="alert alert-info">서버에 텔레그램 봇 토큰이 설정되어 있지 않아 알림이 가지 않습니다. 개발자 또는 Render 환경변수 TELEGRAM_BOT_TOKEN 을 확인하세요.</div>}
      <Field label="텔레그램 Chat ID" hint="(숫자, 그룹은 - 로 시작)">
        <input className="input" value={chatId} maxLength={50} placeholder="-1001234567890" onChange={(e) => setChatId(e.target.value)} />
      </Field>
      <div className="toolbar" style={{ margin: 0 }}><span className="spacer" /><button className="btn btn-primary">저장</button></div>
    </form>
  );
}
