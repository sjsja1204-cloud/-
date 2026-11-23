import { useState } from "react";
import { useContentEditor, moveItem, removeAt, setAt } from "./content/useContentEditor";
import PublishBar from "./content/PublishBar";
import { Field, ItemTools, ImageUpload } from "./content/bits";
import Icon from "../components/site/Icon";
import { useSiteData } from "../lib/siteData";
import "./content/editor.css";

const THEMES = [["teal", "청록 (밝은 배경)"], ["navy", "남색 (어두운 배경)"], ["sand", "옅은 노랑 (밝은 배경)"]];
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
        <button type="button" className={tab === "menu" ? "on" : ""} onClick={() => setTab("menu")}>상단 메뉴</button>
        <button type="button" className={tab === "hero" ? "on" : ""} onClick={() => setTab("hero")}>맨 위 배너</button>
        <button type="button" className={tab === "quote" ? "on" : ""} onClick={() => setTab("quote")}>간편 견적</button>
        <button type="button" className={tab === "benefits" ? "on" : ""} onClick={() => setTab("benefits")}>혜택 강조 · 안내 문구</button>
      </div>
      {tab === "menu" ? <MenuEditor /> : tab === "hero" ? <HeroEditor /> : tab === "quote" ? <QuoteEditor /> : <BenefitsEditor />}
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
        onClick={() => setBanners([...banners, { kicker: "", title: "", desc: "", cta: { label: "상담 신청", to: "/apply" }, theme: "teal", image: "" }])}>
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

const SPEED_KEYS = ["100M", "200M", "500M", "1G"];
const SERVICE_KEYS = [["internet", "인터넷만"], ["internet_tv", "인터넷 + TV"], ["internet_tv_usim", "인터넷 + TV + 유심"]];

/** 간편 견적 블록 문구 (요금은 '요금표' 메뉴의 속도 분류·인터넷 단독 요금에서 계산) */
function QuoteEditor() {
  const ed = useContentEditor("quote");
  if (!ed.data) return <div className="center-msg">{ed.msg?.text || "불러오는 중…"}</div>;
  const d = ed.data;
  const set = (patch) => ed.update({ ...d, ...patch });
  const inp = (k, label, max, ph, wide) => (
    <Field label={label} wide={wide}>
      <input className="input" value={d[k]} maxLength={max} placeholder={ph || ""} onChange={(e) => set({ [k]: e.target.value })} />
    </Field>
  );
  return (
    <>
      <PublishBar ed={ed} contentKey="quote" previewPath="/" label="간편 견적" />
      <section className="ecard open">
        <header className="ecard-head"><b>블록 표시</b><span className="hint">메인 배너 바로 아래</span></header>
        <div className="ecard-body">
          <label className="switch-row">
            <input type="checkbox" checked={d.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
            <span><b>메인 화면에 간편 견적 보이기</b> — 끄면 빠른 메뉴의 '상품 찾기' 버튼은 상담 신청 창을 엽니다.</span>
          </label>
          <div className="efields">
            {inp("kicker", "작은 제목", 30, "예: 3초 견적")}
            {inp("liveBadge", "상담중 배지 문구", 20, "예: 실시간 상담중")}
            {inp("title", "큰 제목", 100, "", true)}
            {inp("desc", "설명", 300, "", true)}
          </div>
          <p className="hint">상담중 배지는 <b>사이트 설정 → 사업자 정보</b>의 상담 시작·종료 시간 안에만 보여요.</p>
        </div>
      </section>

      <section className="ecard open">
        <header className="ecard-head"><b>가입 서비스 이름</b></header>
        <div className="ecard-body">
          <div className="efields">
            {SERVICE_KEYS.map(([k, l]) => (
              <Field key={k} label={l}>
                <input className="input" value={d.services[k]} maxLength={30} onChange={(e) => set({ services: { ...d.services, [k]: e.target.value } })} />
              </Field>
            ))}
            <Field label="유심 포함 선택 시 안내 문구" wide>
              <textarea className="textarea" value={d.usimNotice} maxLength={300} onChange={(e) => set({ usimNotice: e.target.value })} />
            </Field>
          </div>
        </div>
      </section>

      <section className="ecard open">
        <header className="ecard-head"><b>인터넷 속도 설명</b><span className="hint">통신사에 실제 있는 속도만 고객에게 보여요 (요금표의 '속도 분류')</span></header>
        <div className="ecard-body">
          {SPEED_KEYS.map((s) => (
            <div key={s} className="speed-row">
              <b className="speed-tag">{s}</b>
              <input className="input" value={d.speeds[s].short} maxLength={30} placeholder="짧은 설명 (버튼 아래)"
                onChange={(e) => set({ speeds: { ...d.speeds, [s]: { ...d.speeds[s], short: e.target.value } } })} />
              <input className="input grow" value={d.speeds[s].detail} maxLength={200} placeholder="자세한 설명 (물음표에 표시)"
                onChange={(e) => set({ speeds: { ...d.speeds, [s]: { ...d.speeds[s], detail: e.target.value } } })} />
            </div>
          ))}
        </div>
      </section>

      <section className="ecard open">
        <header className="ecard-head"><b>휴대폰 결합 · 결과</b></header>
        <div className="ecard-body">
          <div className="efields">
            {inp("mobileNo", "선택 안 함 버튼", 20)}
            {inp("mobileYes", "결합 선택 버튼", 20)}
            {inp("mobileNote", "결합 선택 시 결과 안내", 200, "", true)}
            {inp("resultNote", "결과 아래 작은 안내", 300, "", true)}
            {inp("ctaLabel", "상담 신청 버튼 문구", 30)}
          </div>
          <p className="hint">금액·보상률 같은 광고 문구는 확정된 내용만 입력하세요.</p>
        </div>
      </section>
    </>
  );
}

/** 상단 메뉴: 이름·링크·순서·켜기/끄기, 드롭다운 하위 항목 추가·삭제 */
function MenuEditor() {
  const ed = useContentEditor("menu");
  const { carriers } = useSiteData();
  if (!ed.data) return <div className="center-msg">{ed.msg?.text || "불러오는 중…"}</div>;
  const items = ed.data.items;
  const setItems = (v) => ed.update({ items: v });
  const setItem = (i, patch) => setItems(setAt(items, i, { ...items[i], ...patch }));
  const suggestions = [
    ...carriers.map((c) => [`/internet/${c.id}`, `${c.name} 통신사 페이지`]),
    ["/internet", "인터넷·TV 전체 비교"], ["/tips", "꿀팁게시판 (준비중)"], ["/reviews", "후기"], ["/support", "고객센터 (자주 묻는 질문)"], ["/support/notice", "공지사항"],
    ["/event", "이벤트"], ["/apply", "상담 신청"],
    ["/mobile", "휴대폰"], ["/bundle", "결합할인"],
  ];
  const linkInput = (value, onChange, opt) => (
    <input className="input" value={value} maxLength={300} list="menu-links" placeholder={opt ? "(드롭다운만 쓰면 비워 두세요)" : "/internet/kt"}
      onChange={(e) => onChange(e.target.value.trim())} />
  );
  return (
    <>
      <PublishBar ed={ed} contentKey="menu" previewPath="/" label="상단 메뉴" />
      <p className="hint" style={{ margin: "0 0 12px" }}>
        숨김 처리된 통신사로 가는 메뉴(/internet/…)는 자동으로 빠집니다. 하위 메뉴가 있으면 PC 에서는 드롭다운, 휴대폰에서는 펼침 메뉴가 돼요.
      </p>
      <datalist id="menu-links">{suggestions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</datalist>
      {items.map((m, i) => (
        <section key={i} className={`ecard open menu-card ${m.enabled ? "" : "off"}`}>
          <header className="ecard-head">
            <b>{m.label || "(이름 없음)"}</b>
            {!m.enabled && <span className="badge">꺼짐</span>}
            {m.children.length > 0 && <span className="badge">드롭다운 {m.children.length}개</span>}
            <span className="spacer" />
            <ItemTools i={i} n={items.length} onMove={(k, d) => setItems(moveItem(items, k, d))}
              onRemove={(k) => setItems(removeAt(items, k))} confirmText={`'${m.label}' 메뉴를 삭제할까요?`} />
          </header>
          <div className="ecard-body">
            <div className="efields">
              <Field label="메뉴 이름"><input className="input" value={m.label} maxLength={30} onChange={(e) => setItem(i, { label: e.target.value })} /></Field>
              <Field label="링크" hint={m.children.length ? "(선택)" : ""}>{linkInput(m.to, (v) => setItem(i, { to: v }), m.children.length > 0)}</Field>
            </div>
            <label className="switch-row">
              <input type="checkbox" checked={m.enabled} onChange={(e) => setItem(i, { enabled: e.target.checked })} />
              <span><b>켜기</b> — 끄면 상단 메뉴와 푸터에서 빠집니다.</span>
            </label>
            <p className="efield-label">하위 메뉴 (드롭다운)</p>
            {m.children.map((c, k) => (
              <div key={k} className={`menu-child ${c.enabled ? "" : "off"}`}>
                <input className="input" value={c.label} maxLength={30} placeholder="이름" aria-label="하위 메뉴 이름"
                  onChange={(e) => setItem(i, { children: setAt(m.children, k, { ...c, label: e.target.value }) })} />
                {linkInput(c.to, (v) => setItem(i, { children: setAt(m.children, k, { ...c, to: v }) }))}
                <label className="toggle"><input type="checkbox" checked={c.enabled}
                  onChange={(e) => setItem(i, { children: setAt(m.children, k, { ...c, enabled: e.target.checked }) })} /><span>{c.enabled ? "켜짐" : "꺼짐"}</span></label>
                <ItemTools i={k} n={m.children.length} onMove={(x, d) => setItem(i, { children: moveItem(m.children, x, d) })}
                  onRemove={(x) => setItem(i, { children: removeAt(m.children, x) })} confirmText={`'${c.label}' 하위 메뉴를 삭제할까요?`} />
              </div>
            ))}
            <button type="button" className="btn btn-sm" disabled={m.children.length >= 12}
              onClick={() => setItem(i, { children: [...m.children, { label: "", to: "", enabled: true }] })}>+ 하위 메뉴</button>
          </div>
        </section>
      ))}
      <button type="button" className="btn" disabled={items.length >= 10}
        onClick={() => setItems([...items, { label: "", to: "", enabled: true, children: [] }])}>+ 메뉴 추가</button>
    </>
  );
}
