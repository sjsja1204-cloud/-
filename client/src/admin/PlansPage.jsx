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
  bundle: true,
  priceNote: "",
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
              {[["price", "요금표"], ["discount", cur.bundle === false ? "결합할인표 (꺼짐)" : `결합할인표 (${cur.discountTables.length})`], ["info", "기본 정보"]].map(([k, l]) => (
                <button key={k} type="button" className={tab === k ? "on" : ""} onClick={() => setTab(k)}
                  disabled={k === "discount" && cur.bundle === false} title={k === "discount" && cur.bundle === false ? "결합할인 사용이 꺼져 있습니다" : undefined}>{l}</button>
              ))}
            </div>

            {cur.bundle === false && (
              <p className="notice-box" role="note" style={{ margin: "0 0 12px" }}>
                <b>결합할인 사용이 꺼져 있습니다.</b> 이 통신사는 결합할인표가 홈페이지에 나오지 않고, 간편 견적·상담 창에서 인터넷+TV+유심 선택이 빠집니다.
                {cur.mobileSelect === true ? " 휴대폰 결합 선택은 받지만 결합 할인은 계산하지 않아요." : " 휴대폰 결합 선택도 빠집니다."}
                {tab !== "info" && <> 바꾸려면 <b>기본 정보</b> 탭에서 켜세요.</>}
              </p>
            )}

            {tab === "price" && (
              <div className="ecard-body">
                <div className="efields">
                  <Field label="요금표 제목"><input className="input" value={cur.priceTable.title} maxLength={200} onChange={(e) => setCur({ priceTable: { ...cur.priceTable, title: e.target.value } })} /></Field>
                  <Field label="설명" hint="(선택)" wide><input className="input" value={cur.priceTable.desc} maxLength={1000} onChange={(e) => setCur({ priceTable: { ...cur.priceTable, desc: e.target.value } })} /></Field>
                </div>
                <p className="efield-label">월 요금 <span className="hint">(칸을 눌러 숫자만 입력 · 빨간 칸은 비어 있어요)</span></p>
                <p className="hint" style={{ margin: "0 0 8px" }}>
                  인터넷 상품 칸 아래: <b>속도 분류</b>(간편 견적 버튼) · <b>단독 요금</b>(인터넷만 가입 시 월 요금, 홈페이지 표에 '인터넷만' 열로 나옴) · <b>결합 할인</b>(휴대폰 결합 시 인터넷 월 할인액, 예상 요금에서 뺌 · 비우면 '결합할인 문의').
                  단독 요금이 있는 상품은 TV 칸을 비워 둘 수 있어요 (홈페이지에 '상담 문의').
                </p>
                <PriceGrid table={cur.priceTable} onChange={(v) => setCur({ priceTable: v })} />
                <Field label="표 아래 안내 문구" hint="(한 줄에 하나씩, ※ 표시로 나옵니다)" wide>
                  <LinesInput value={cur.priceTable.notes} onChange={(v) => setCur({ priceTable: { ...cur.priceTable, notes: v } })} />
                </Field>
              </div>
            )}

            {tab === "discount" && cur.bundle !== false && <DiscountEditor tables={cur.discountTables} onChange={(v) => setCur({ discountTables: v })} />}

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
        <Field label="예상 요금 옆 안내" hint="(선택, 30자 · 간편 견적·상담 창의 예상 요금 옆에 작게 표시)">
          <input className="input" value={c.priceNote || ""} maxLength={30} onChange={(e) => onChange({ priceNote: e.target.value })} placeholder="예: 결합할인 문의" />
        </Field>
      </div>
      <div className="efield wide" style={{ marginBottom: 14 }}>
        <p className="efield-label">통신사 로고 <span className="hint">(선택)</span></p>
        <p className="notice-box">로고 사용 권한이 있는 경우에만 등록하세요. 등록하지 않으면 통신사 이름이 글자로 표시됩니다. 로고를 올려도 선택 표시 색은 담아가넷 색상이에요.</p>
        <ImageUpload value={c.logo || ""} kind="logo" onChange={(v) => onChange({ logo: v })} />
      </div>
      <label className="switch-row">
        <input type="checkbox" checked={c.bundle !== false} onChange={(e) => onChange({ bundle: e.target.checked })} />
        <span><b>결합할인 사용</b> — 끄면 결합할인표·혜택 박스가 홈페이지에 나오지 않고, 결합 할인을 예상 요금에서 빼지 않으며, 간편 견적·상담 창에서 인터넷+TV+유심이 빠집니다 (스카이라이프·LG헬로비전 등 알뜰상품). 결합할인표 내용은 그대로 남아요.</span>
      </label>
      <label className="switch-row">
        <input type="checkbox" checked={typeof c.mobileSelect === "boolean" ? c.mobileSelect : c.bundle !== false}
          onChange={(e) => onChange({ mobileSelect: e.target.checked })} />
        <span><b>휴대폰 결합 선택 받기</b> — 간편 견적·상담 창에 '휴대폰 결합' 선택이 나옵니다. 결합할인 사용을 꺼도 켤 수 있어요 (예: LG헬로비전 — 할인 계산 없이 '예상 요금 옆 안내' 문구를 함께 보여 줌).</span>
      </label>
      <label className="switch-row">
        <input type="checkbox" checked={!c.hidden} onChange={(e) => onChange({ hidden: !e.target.checked })} />
        <span><b>홈페이지에 보이기</b> — 끄면 메뉴와 요금 비교에서 빠집니다 (내용은 그대로 남아요).</span>
      </label>
    </div>
  );
}
