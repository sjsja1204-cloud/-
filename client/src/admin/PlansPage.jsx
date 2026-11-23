import { useState } from "react";
import { useContentEditor, moveItem, removeAt, setAt } from "./content/useContentEditor";
import PublishBar from "./content/PublishBar";
import PriceGrid from "./content/PriceGrid";
import DiscountEditor from "./content/DiscountEditor";
import { Field, LinesInput, ImageUpload } from "./content/bits";
import { useSiteData } from "../lib/siteData";
import "./content/editor.css";

const newCarrier = (n) => ({
  id: `carrier-${Date.now().toString(36)}`,
  name: "",
  hidden: true, // 다 채우기 전엔 숨김
  logo: "",
  tagline: "",
  intro: "",
  highlights: [],
  formCarrier: "",
  priceTable: { title: "", desc: "와이파이 공유기(AP) 포함 월 요금입니다.", tvPlans: [""], rows: [{ internet: "", speed: null, internetOnly: null, prices: [null] }], notes: [] },
  discountTables: [],
  _n: n,
});

/** 관리자: 요금표 · 결합할인표 */
export default function PlansPage() {
  const ed = useContentEditor("plans");
  const [sel, setSel] = useState(0);
  const [tab, setTab] = useState("price");
  if (!ed.data) return <div className="center-msg">{ed.msg?.text || "불러오는 중…"}</div>;

  const carriers = ed.data.carriers;
  const cur = carriers[Math.min(sel, carriers.length - 1)];
  const setCarriers = (v) => ed.update({ carriers: v });
  const setCur = (patch) => setCarriers(setAt(carriers, carriers.indexOf(cur), { ...cur, ...patch }));

  const add = () => {
    const { _n, ...c } = newCarrier(carriers.length);
    setCarriers([...carriers, c]);
    setSel(carriers.length);
    setTab("info");
  };
  const remove = (i) => {
    if (!confirm(`'${carriers[i].name || "이름 없는"}' 통신사와 요금표·결합할인표를 모두 삭제할까요?\n\n삭제해도 '이전 버전'에서 되돌릴 수 있어요.`)) return;
    setCarriers(removeAt(carriers, i));
    setSel(Math.max(0, i - 1));
  };
  const move = (i, d) => {
    setCarriers(moveItem(carriers, i, d));
    setSel(i + d);
  };

  return (
    <div className="editor-page">
      <h2 className="page-title">요금표 관리</h2>
      <p className="page-desc">요금을 바꾼 뒤 <b>미리보기</b>로 확인하고 <b>사이트에 반영하기</b>를 누르세요. 누르기 전에는 고객 화면이 바뀌지 않아요.</p>
      <PublishBar ed={ed} contentKey="plans" previewPath={cur ? `/internet/${cur.id}` : "/internet"} label="요금표" />

      <div className="plans-layout">
        <aside className="carrier-list">
          <p className="efield-label">통신사</p>
          {carriers.map((c, i) => (
            <div key={i} className={`carrier-item ${c === cur ? "on" : ""}`}>
              <button type="button" className="carrier-pick" onClick={() => setSel(i)}>
                <span>{c.name || "(이름 없음)"}</span>
                {c.hidden && <span className="badge">숨김</span>}
              </button>
              <span className="itools">
                <button type="button" className="ibtn" disabled={i === 0} onClick={() => move(i, -1)} aria-label="위로">▲</button>
                <button type="button" className="ibtn" disabled={i === carriers.length - 1} onClick={() => move(i, 1)} aria-label="아래로">▼</button>
                <button type="button" className="ibtn danger" onClick={() => remove(i)} aria-label="삭제">✕</button>
              </span>
            </div>
          ))}
          <button type="button" className="btn btn-sm btn-block" onClick={add} disabled={carriers.length >= 20}>+ 통신사 추가</button>
        </aside>

        {cur ? (
          <section className="carrier-edit">
            <div className="etabs">
              {[["price", "요금표"], ["discount", `결합할인표 (${cur.discountTables.length})`], ["info", "기본 정보"]].map(([k, l]) => (
                <button key={k} type="button" className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
              ))}
            </div>

            {tab === "price" && (
              <div className="ecard-body">
                <div className="efields">
                  <Field label="요금표 제목"><input className="input" value={cur.priceTable.title} maxLength={200} onChange={(e) => setCur({ priceTable: { ...cur.priceTable, title: e.target.value } })} /></Field>
                  <Field label="설명" hint="(선택)" wide><input className="input" value={cur.priceTable.desc} maxLength={1000} onChange={(e) => setCur({ priceTable: { ...cur.priceTable, desc: e.target.value } })} /></Field>
                </div>
                <p className="efield-label">월 요금 <span className="hint">(칸을 눌러 숫자만 입력 · 빨간 칸은 비어 있어요)</span></p>
                <PriceGrid table={cur.priceTable} onChange={(v) => setCur({ priceTable: v })} />
                <Field label="표 아래 안내 문구" hint="(한 줄에 하나씩, ※ 표시로 나옵니다)" wide>
                  <LinesInput value={cur.priceTable.notes} onChange={(v) => setCur({ priceTable: { ...cur.priceTable, notes: v } })} />
                </Field>
              </div>
            )}

            {tab === "discount" && <DiscountEditor tables={cur.discountTables} onChange={(v) => setCur({ discountTables: v })} />}

            {tab === "info" && <CarrierInfo c={cur} onChange={setCur} />}
          </section>
        ) : (
          <p className="hint">통신사를 추가하세요.</p>
        )}
      </div>
    </div>
  );
}

function CarrierInfo({ c, onChange }) {
  const { formOptions } = useSiteData();
  return (
    <div className="ecard-body">
      <div className="efields">
        <Field label="통신사 이름"><input className="input" value={c.name} maxLength={50} onChange={(e) => onChange({ name: e.target.value })} placeholder="예: KT" /></Field>
        <Field label="한 줄 소개" hint="(통신사 페이지 제목 아래 · 요금 카드)" wide><input className="input" value={c.tagline} maxLength={200} onChange={(e) => onChange({ tagline: e.target.value })} placeholder="예: 기가인터넷 대표 사업자, 안정적인 속도" /></Field>
        <Field label="통신사 소개 문구" hint="(통신사 페이지 상단 소개 상자, 줄바꿈 그대로 표시)" wide>
          <textarea className="textarea" rows={3} value={c.intro || ""} maxLength={1000} onChange={(e) => onChange({ intro: e.target.value })} />
        </Field>
        <Field label="대표 혜택 문구" hint="(한 줄에 하나, 최대 6개 · 소개 상자에 체크 표시로 나와요)" wide>
          <LinesInput value={c.highlights || []} rows={3} onChange={(v) => onChange({ highlights: v.slice(0, 6) })} placeholder={"확정된 혜택만 입력하세요"} />
        </Field>
        <Field label="주소용 영문 이름" hint={`(홈페이지 주소 /internet/${c.id} 에 쓰여요. 영어 소문자·숫자·-)`}>
          <input className="input" value={c.id} maxLength={30} onChange={(e) => onChange({ id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} />
        </Field>
        <Field label="상담 폼에서 미리 선택할 통신사" hint="(이 통신사 페이지의 상담 폼)">
          <select className="select" value={c.formCarrier} onChange={(e) => onChange({ formCarrier: e.target.value })}>
            <option value="">선택 안 함</option>
            {formOptions.carriers.map((x) => <option key={x}>{x}</option>)}
          </select>
        </Field>
      </div>
      <div className="efield wide" style={{ marginBottom: 14 }}>
        <p className="efield-label">통신사 로고 <span className="hint">(선택)</span></p>
        <p className="notice-box">로고 사용 권한이 있는 경우에만 등록하세요. 등록하지 않으면 통신사 이름이 글자로 표시됩니다. 로고를 올려도 선택 표시 색은 담아가넷 색상이에요.</p>
        <ImageUpload value={c.logo || ""} kind="logo" onChange={(v) => onChange({ logo: v })} />
      </div>
      <label className="switch-row">
        <input type="checkbox" checked={!c.hidden} onChange={(e) => onChange({ hidden: !e.target.checked })} />
        <span><b>홈페이지에 보이기</b> — 끄면 메뉴와 요금 비교에서 빠집니다 (내용은 그대로 남아요).</span>
      </label>
    </div>
  );
}
