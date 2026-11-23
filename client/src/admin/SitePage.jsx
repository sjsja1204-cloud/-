import { useState } from "react";
import { useContentEditor, moveItem, removeAt, setAt } from "./content/useContentEditor";
import PublishBar from "./content/PublishBar";
import { Field, ItemTools, ImageUpload } from "./content/bits";
import Icon from "../components/site/Icon";
import "./content/editor.css";

const THEMES = [["orange", "주황 (밝은 배경)"], ["navy", "남색 (어두운 배경)"], ["mint", "민트 (밝은 배경)"]];
const ICONS = [
  ["shield", "방패(안심)"], ["calc", "계산기"], ["headset", "상담원"], ["check", "체크"], ["star", "별"], ["gift", "선물"],
  ["wifi", "와이파이"], ["tv", "TV"], ["phone", "휴대폰"], ["link", "결합"], ["wrench", "설치"], ["clipboard", "신청서"],
  ["bell", "알림"], ["chat", "말풍선"], ["question", "물음표"],
];

/** 관리자: 메인 화면 문구 (배너 / 혜택 강조) — 정해진 자리의 내용만 바꾼다 */
export default function SitePage() {
  const [tab, setTab] = useState("hero");
  return (
    <div className="editor-page">
      <h2 className="page-title">메인 화면 관리</h2>
      <p className="page-desc">첫 화면의 문구를 바꿀 수 있어요. 고친 뒤 <b>미리보기</b>로 확인하고 <b>사이트에 반영하기</b>를 누르세요.</p>
      <div className="etabs">
        <button type="button" className={tab === "hero" ? "on" : ""} onClick={() => setTab("hero")}>맨 위 배너</button>
        <button type="button" className={tab === "benefits" ? "on" : ""} onClick={() => setTab("benefits")}>혜택 강조 · 안내 문구</button>
      </div>
      {tab === "hero" ? <HeroEditor /> : <BenefitsEditor />}
    </div>
  );
}

function HeroEditor() {
  const ed = useContentEditor("hero");
  if (!ed.data) return <div className="center-msg">{ed.msg?.text || "불러오는 중…"}</div>;
  const banners = ed.data.banners;
  const setBanners = (v) => ed.update({ banners: v });
  const setB = (i, patch) => setBanners(setAt(banners, i, { ...banners[i], ...patch }));

  return (
    <>
      <PublishBar ed={ed} contentKey="hero" previewPath="/" label="메인 배너" />
      <p className="hint">배너가 여러 개면 5초마다 넘어갑니다 (최대 5개). 큰 제목은 줄을 바꾸면 화면에서도 줄이 바뀌어요.</p>
      {banners.map((b, i) => (
        <section key={i} className="ecard open">
          <header className="ecard-head">
            <b>배너 {i + 1}</b>
            <span className="hint">{b.title.split("\n")[0]}</span>
            <span className="spacer" />
            <ItemTools i={i} n={banners.length} onMove={(k, d) => setBanners(moveItem(banners, k, d))}
              onRemove={(k) => setBanners(removeAt(banners, k))} confirmText={`배너 ${i + 1}을(를) 삭제할까요?`} />
          </header>
          <div className="ecard-body">
            <div className="efields">
              <Field label="작은 제목" hint="(제목 위 꼬리표, 선택)"><input className="input" value={b.kicker} maxLength={50} onChange={(e) => setB(i, { kicker: e.target.value })} /></Field>
              <Field label="색상"><select className="select" value={b.theme} onChange={(e) => setB(i, { theme: e.target.value })}>{THEMES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
              <Field label="큰 제목" wide><textarea className="textarea" rows={2} value={b.title} maxLength={200} onChange={(e) => setB(i, { title: e.target.value })} /></Field>
              <Field label="부제목" hint="(선택)" wide><input className="input" value={b.desc} maxLength={300} onChange={(e) => setB(i, { desc: e.target.value })} /></Field>
              <Field label="버튼 문구"><input className="input" value={b.cta.label} maxLength={30} onChange={(e) => setB(i, { cta: { ...b.cta, label: e.target.value } })} /></Field>
              <Field label="버튼 누르면 이동할 곳" hint="(/internet, #apply, https://…)">
                <input className="input" value={b.cta.to} maxLength={300} onChange={(e) => setB(i, { cta: { ...b.cta, to: e.target.value.trim() } })} />
              </Field>
              <Field label="배경 이미지" hint="(선택 · 오른쪽에 깔리고 글자 쪽은 색상으로 덮여요)" wide>
                <ImageUpload kind="banner" value={b.image || ""} onChange={(url) => setB(i, { image: url })} />
              </Field>
            </div>
          </div>
        </section>
      ))}
      <button type="button" className="btn btn-sm" disabled={banners.length >= 5}
        onClick={() => setBanners([...banners, { kicker: "", title: "", desc: "", cta: { label: "상담 신청", to: "/apply" }, theme: "orange", image: "" }])}>
        + 배너 추가
      </button>
    </>
  );
}

function BenefitsEditor() {
  const ed = useContentEditor("benefits");
  if (!ed.data) return <div className="center-msg">{ed.msg?.text || "불러오는 중…"}</div>;
  const d = ed.data;
  const set = (patch) => ed.update({ ...d, ...patch });

  return (
    <>
      <PublishBar ed={ed} contentKey="benefits" previewPath="/" label="혜택 강조 문구" />
      <section className="ecard open">
        <header className="ecard-head"><b>혜택 강조</b><span className="hint">메인 중간, 실시간 상담 현황 옆 (2~4개)</span></header>
        <div className="ecard-body">
          <div className="efields">
            <Field label="작은 제목" hint="(선택)"><input className="input" value={d.kicker} maxLength={50} onChange={(e) => set({ kicker: e.target.value })} /></Field>
            <Field label="제목" hint="(줄 바꿈 가능)" wide><textarea className="textarea" rows={2} value={d.title} maxLength={200} onChange={(e) => set({ title: e.target.value })} /></Field>
          </div>
          {d.items.map((it, i) => (
            <div key={i} className="benefit-row">
              <span className="benefit-ic"><Icon name={it.icon} /></span>
              <select className="select" value={it.icon} onChange={(e) => set({ items: setAt(d.items, i, { ...it, icon: e.target.value }) })} aria-label="아이콘">
                {ICONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <input className="input" value={it.title} placeholder="제목" maxLength={50} onChange={(e) => set({ items: setAt(d.items, i, { ...it, title: e.target.value }) })} />
              <input className="input grow" value={it.desc} placeholder="설명" maxLength={200} onChange={(e) => set({ items: setAt(d.items, i, { ...it, desc: e.target.value }) })} />
              <ItemTools i={i} n={d.items.length} onMove={(k, x) => set({ items: moveItem(d.items, k, x) })}
                onRemove={d.items.length > 2 ? (k) => set({ items: removeAt(d.items, k) }) : null} confirmText="이 문구를 삭제할까요?" />
            </div>
          ))}
          <button type="button" className="btn btn-sm" disabled={d.items.length >= 4} onClick={() => set({ items: [...d.items, { icon: "check", title: "", desc: "" }] })}>+ 강조 문구</button>
        </div>
      </section>

      <section className="ecard open">
        <header className="ecard-head"><b>혜택 안내 문구</b><span className="hint">최근 실제 상담 신청이 5건 미만일 때 '실시간 현황' 자리에 대신 나옵니다</span></header>
        <div className="ecard-body">
          {d.promos.map((p, i) => (
            <div key={i} className="benefit-row">
              <input className="input tag" value={p.tag} placeholder="꼬리표" maxLength={10} onChange={(e) => set({ promos: setAt(d.promos, i, { ...p, tag: e.target.value }) })} />
              <input className="input grow" value={p.text} placeholder="문구" maxLength={100} onChange={(e) => set({ promos: setAt(d.promos, i, { ...p, text: e.target.value }) })} />
              <ItemTools i={i} n={d.promos.length} onMove={(k, x) => set({ promos: moveItem(d.promos, k, x) })}
                onRemove={(k) => set({ promos: removeAt(d.promos, k) })} confirmText="이 문구를 삭제할까요?" />
            </div>
          ))}
          <button type="button" className="btn btn-sm" disabled={d.promos.length >= 10} onClick={() => set({ promos: [...d.promos, { tag: "", text: "" }] })}>+ 안내 문구</button>
        </div>
      </section>
    </>
  );
}
