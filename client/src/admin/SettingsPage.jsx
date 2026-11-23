import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useSiteData } from "../lib/siteData";
import { clearStatusCache } from "../components/panel/hooks";
import { Field, ItemTools } from "./content/bits";
import { moveItem, removeAt, setAt } from "./content/useContentEditor";
import { isCarrierLikeColor, brandVars } from "../lib/color";
import "./content/editor.css";

const BUSINESS_FIELDS = [
  ["name", "상호", "담아가넷"],
  ["ceo", "대표자"],
  ["phone", "대표번호 (있으면 전화 버튼이 생겨요)", "02-000-0000"],
  ["email", "이메일"],
  ["hours", "상담 운영시간", "예: 평일 09:00~18:00 (주말·공휴일 휴무)"],
  ["kakaoUrl", "카카오톡 채널 주소 (있으면 고객센터에 표시)", "https://pf.kakao.com/..."],
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
        {[["business", "사업자 정보"], ["consult", "빠른 상담 메뉴"], ["brand", "브랜드 색상"], ["form", "상담 폼 선택지"], ["status", "상담 상태값"], ["telegram", "알림"]].map(([k, l]) => (
          <button key={k} type="button" className={tab === k ? "on" : ""} onClick={() => { setTab(k); setMsg(null); }}>{l}</button>
        ))}
      </div>
      {msg && <div className={`alert ${msg.err ? "alert-err" : "alert-ok"}`} onClick={() => setMsg(null)}>{msg.text}</div>}
      {!data ? <p className="hint">불러오는 중…</p> : (
        <>
          {tab === "business" && <BusinessForm value={data.business} onSave={(v) => save("business", v)} />}
          {tab === "consult" && <ConsultForm value={data.consult} hasPhone={!!data.business.phone} onSave={(v) => save("consult", v)} />}
          {tab === "brand" && <BrandForm value={data.brand} onSave={(v) => save("brand", v)} />}
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
      <div className="efield" style={{ margin: "4px 0 14px" }}>
        <p className="efield-label">'실시간 상담중' 표시 시간 <span className="hint">(한국시간. 비우면 표시 안 함 — 메인 간편 견적 배지)</span></p>
        <div className="color-row">
          <input type="time" className="input" style={{ width: 130 }} value={f.openTime || ""} onChange={(e) => setF({ ...f, openTime: e.target.value })} aria-label="상담 시작 시간" />
          <span>~</span>
          <input type="time" className="input" style={{ width: 130 }} value={f.closeTime || ""} onChange={(e) => setF({ ...f, closeTime: e.target.value })} aria-label="상담 종료 시간" />
          <div className="days" role="group" aria-label="상담 요일">
            {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => {
              const days = f.openDays || [];
              return (
                <label key={i}>
                  <input type="checkbox" checked={days.includes(i)}
                    onChange={(e) => setF({ ...f, openDays: e.target.checked ? [...days, i].sort() : days.filter((x) => x !== i) })} />{d}
                </label>
              );
            })}
          </div>
        </div>
      </div>
      <div className="toolbar" style={{ margin: 0 }}><span className="spacer" /><button className="btn btn-primary">저장</button></div>
    </form>
  );
}

const MENU_INFO = {
  subsidy: "누르면 상담 신청 창 (유형: 지원금 안내)",
  consult: "누르면 상담 신청 창 (유형: 맞춤 상담)",
  recommend: "강조 버튼. 메인의 간편 견적으로 이동 (간편 견적을 꺼 두면 상담 신청 창)",
  call: "대표번호로 전화. 사업자 정보에 대표번호가 없으면 숨겨져요",
};
const MODAL_INFO = [["subsidy", "지원금 안내"], ["consult", "맞춤 상담"], ["recommend", "상품 찾기"], ["quote", "간편 견적에서 신청"]];

/** 빠른 상담 메뉴 (PC 오른쪽 / 모바일 하단) + 공통 상담 신청 창 문구 */
function ConsultForm({ value, hasPhone, onSave }) {
  const [f, setF] = useState(value);
  useEffect(() => setF(value), [value]);
  const menu = f.menu;
  const setMenu = (v) => setF({ ...f, menu: v });
  const setModal = (k, patch) => setF({ ...f, modals: { ...f.modals, [k]: { ...f.modals[k], ...patch } } });
  const bad = menu.some((m) => !m.label.trim()) || MODAL_INFO.some(([k]) => !f.modals[k]?.title.trim()) || !f.submitLabel.trim() || !f.doneTitle.trim();
  return (
    <form className="card ecard-body" onSubmit={(e) => { e.preventDefault(); onSave(f); }}>
      <p className="hint">홈페이지 오른쪽(휴대폰은 화면 아래)에 고정된 버튼입니다. 문구·순서·켜기/끄기를 바꿀 수 있어요. <b>지원금 금액이나 보상률 같은 광고 문구는 확정된 내용만</b> 넣으세요.</p>
      <p className="efield-label">버튼</p>
      {menu.map((m, i) => (
        <div key={m.type} className="qm-row">
          <ItemTools i={i} n={menu.length} onMove={(k, d) => setMenu(moveItem(menu, k, d))} />
          <input className="input" value={m.label} maxLength={20} aria-label="버튼 문구" onChange={(e) => setMenu(setAt(menu, i, { ...m, label: e.target.value }))} />
          <label className="toggle"><input type="checkbox" checked={m.enabled} onChange={(e) => setMenu(setAt(menu, i, { ...m, enabled: e.target.checked }))} /><span>{m.enabled ? "켜짐" : "꺼짐"}</span></label>
          <span className="qm-type">{MENU_INFO[m.type]}{m.type === "call" && !hasPhone ? " (현재 숨김)" : ""}</span>
        </div>
      ))}

      <p className="efield-label" style={{ marginTop: 22 }}>상담 신청 창 문구 <span className="hint">(어떤 버튼으로 열었는지에 따라 제목·안내·신청 버튼이 달라져요)</span></p>
      {MODAL_INFO.map(([k, l]) => (
        <div key={k} className="efields" style={{ marginBottom: 10 }}>
          <Field label={l + " — 제목"}><input className="input" value={f.modals[k]?.title || ""} maxLength={60} onChange={(e) => setModal(k, { title: e.target.value })} /></Field>
          <Field label="안내 문구"><input className="input" value={f.modals[k]?.desc || ""} maxLength={200} onChange={(e) => setModal(k, { desc: e.target.value })} /></Field>
          <Field label="신청 버튼 문구" hint="(비우면 아래 기본 문구)"><input className="input" value={f.modals[k]?.submitLabel || ""} maxLength={20} placeholder={f.submitLabel} onChange={(e) => setModal(k, { submitLabel: e.target.value })} /></Field>
        </div>
      ))}
      <div className="efields">
        <Field label="기본 신청 버튼 문구"><input className="input" value={f.submitLabel} maxLength={20} onChange={(e) => setF({ ...f, submitLabel: e.target.value })} /></Field>
        <Field label="완료 제목"><input className="input" value={f.doneTitle} maxLength={40} onChange={(e) => setF({ ...f, doneTitle: e.target.value })} /></Field>
        <Field label="완료 안내 (3초 뒤 창이 닫혀요)" wide><input className="input" value={f.doneDesc} maxLength={120} onChange={(e) => setF({ ...f, doneDesc: e.target.value })} /></Field>
      </div>
      {bad && <span className="err">비어 있는 문구가 있어요.</span>}
      <div className="toolbar" style={{ margin: 0 }}><span className="spacer" /><button className="btn btn-primary" disabled={bad}>저장</button></div>
    </form>
  );
}

const DEFAULT_BRAND = "#0E8F7E";

/** 브랜드 포인트 색 (버튼·선택 표시). 통신사 고유색 계열이면 경고 */
function BrandForm({ value, onSave }) {
  const [color, setColor] = useState(value.color || DEFAULT_BRAND);
  useEffect(() => setColor(value.color || DEFAULT_BRAND), [value]);
  const valid = /^#[0-9a-fA-F]{6}$/.test(color);
  const warn = valid && isCarrierLikeColor(color);
  const vars = valid ? brandVars(color) : null;
  const submit = (e) => {
    e.preventDefault();
    if (warn && !confirm("이 색은 통신사 고유색(빨강·주황·분홍 계열)과 비슷해 통신사로부터 제재를 받을 수 있어요.\n\n그래도 이 색으로 바꿀까요?")) return;
    onSave({ color: color.toUpperCase() });
  };
  return (
    <form className="card ecard-body" onSubmit={submit}>
      <p className="hint">버튼, 선택한 항목, 강조 표시에 쓰이는 색입니다. 통신사 고유색과 겹치지 않도록 <b>빨강·주황·분홍(마젠타) 계열은 피해 주세요.</b></p>
      <div className="color-row">
        <input type="color" value={valid ? color : DEFAULT_BRAND} onChange={(e) => setColor(e.target.value)} aria-label="포인트 색 고르기" />
        <input className="input" style={{ width: 130 }} value={color} maxLength={7} onChange={(e) => setColor(e.target.value.trim())} aria-label="색상 코드" />
        {vars && (
          <div className="color-swatches" aria-hidden>
            <span style={{ background: vars["--brand"] }}>기본</span>
            <span style={{ background: vars["--brand-strong"] }}>진하게</span>
            <span style={{ background: vars["--brand-soft"], color: "#1C2A39" }}>연하게</span>
          </div>
        )}
        <button type="button" className="btn btn-sm" onClick={() => setColor(DEFAULT_BRAND)}>기본 색(딥 틸)으로</button>
      </div>
      {!valid && <p className="err">#000000 형식으로 입력하세요.</p>}
      {warn && <div className="alert alert-err" style={{ marginTop: 12 }}>⚠ 통신사 고유색(빨강·주황·마젠타)과 비슷한 색입니다. 다른 색을 권장해요.</div>}
      <div className="toolbar" style={{ margin: "12px 0 0" }}><span className="spacer" /><button className="btn btn-primary" disabled={!valid}>저장</button></div>
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
