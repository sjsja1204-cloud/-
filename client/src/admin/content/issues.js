// 게시 전 검사 (서버 lib/content.js publishIssues 와 같은 규칙) — 문제 위치를 쉬운 말로 알려준다
const blank = (v) => !String(v ?? "").trim();
const isLink = (v) => /^(\/|#|https?:\/\/)/.test(v) && !/\s/.test(v);
const isImage = (v) => !v || /^(\/|https?:\/\/)\S+$/.test(v);

export function findIssues(key, d) {
  const out = [];
  const add = (where, message) => out.push({ where, message });
  if (!d) return out;
  if (key === "plans") {
    if (!d.carriers.some((c) => !c.hidden)) add("통신사", "공개된 통신사가 1곳 이상 있어야 합니다.");
    const ids = new Set();
    d.carriers.forEach((c, ci) => {
      if (!isImage(c.logo)) add(c.name || `${ci + 1}번째 통신사`, "로고 이미지 주소가 올바르지 않습니다.");
      const cn = c.name || `${ci + 1}번째 통신사`;
      if (blank(c.name)) add(cn, "통신사 이름이 비어 있습니다.");
      if (!/^[a-z0-9-]{1,30}$/.test(c.id)) add(cn, "주소용 영문 이름은 영어 소문자·숫자·- 만 쓸 수 있습니다.");
      if (ids.has(c.id)) add(cn, "주소용 영문 이름이 다른 통신사와 같습니다.");
      ids.add(c.id);
      const pt = c.priceTable;
      // 요금 데이터가 아예 없는 통신사는 허용 (고객 화면에 "요금 정보 준비중")
      const noData = !pt.rows.length && !pt.tvPlans.length;
      if (!noData) {
      if (blank(pt.title)) add(`${cn} › 요금표`, "요금표 제목이 비어 있습니다.");
      if (!pt.tvPlans.length) add(`${cn} › 요금표`, "TV 상품(열)이 1개 이상 있어야 합니다.");
      if (!pt.rows.length) add(`${cn} › 요금표`, "인터넷 상품(행)이 1개 이상 있어야 합니다.");
      pt.tvPlans.forEach((t, ti) => blank(t) && add(`${cn} › 요금표`, `${ti + 1}번째 TV 상품 이름이 비어 있습니다.`));
      pt.rows.forEach((r, ri) => {
        const rn = r.internet || `${ri + 1}번째 행`;
        if (blank(r.internet)) add(`${cn} › 요금표`, `${ri + 1}번째 인터넷 상품 이름이 비어 있습니다.`);
        // 인터넷 단독 요금이 있는 행은 TV 칸을 비워 둘 수 있음 (고객 화면 '상담 문의') — 서버 publishIssues 와 같은 규칙
        if (!(Number.isFinite(r.internetOnly) && r.internetOnly > 0)) pt.tvPlans.forEach((t, ti) => {
          const v = r.prices[ti];
          if (v == null || !Number.isFinite(v)) add(`${cn} › 요금표`, `'${rn}' × '${t || ti + 1 + "번째 열"}' 요금 칸이 비어 있습니다. (인터넷 단독 요금이 있으면 비워 둘 수 있어요)`);
        });
      });
      }
      c.discountTables.forEach((t, ti) => {
        const tn = `${cn} › 결합할인 '${t.title || ti + 1 + "번째 표"}'`;
        if (blank(t.title)) add(tn, "표 제목이 비어 있습니다.");
        if (t.rows.length && !t.columns.length) add(tn, "열 이름이 1개 이상 있어야 합니다.");
        t.columns.forEach((h, hi) => blank(h) && add(tn, `${hi + 1}번째 열 이름이 비어 있습니다.`));
        [...(t.boxesTop || []), ...(t.boxes || [])].forEach((b, bi) => {
          if (blank(b.title)) add(tn, `${bi + 1}번째 혜택 박스 제목이 비어 있습니다.`);
          (b.items || []).forEach((it, ii) => blank(it[0]) && add(tn, `'${b.title || "혜택 박스"}' ${ii + 1}번째 항목 이름이 비어 있습니다.`));
        });
      });
    });
  }
  if (key === "hero") {
    if (!d.banners.length) add("메인 배너", "배너가 1개 이상 있어야 합니다.");
    d.banners.forEach((b, i) => {
      const w = `메인 배너 ${i + 1}`;
      if (blank(b.title)) add(w, "큰 제목이 비어 있습니다.");
      if (blank(b.cta.label)) add(w, "버튼 문구가 비어 있습니다.");
      if (!isLink(b.cta.to)) add(w, "버튼 링크는 / 또는 # 또는 https:// 로 시작해야 합니다.");
      if (!isImage(b.image)) add(w, "배경 이미지 주소가 올바르지 않습니다.");
    });
  }
  if (key === "menu") {
    if (!d.items.some((m) => m.enabled)) add("상단 메뉴", "켜진 메뉴가 1개 이상 있어야 합니다.");
    d.items.forEach((m, i) => {
      const w = `상단 메뉴 '${m.label || i + 1 + "번째"}'`;
      if (blank(m.label)) add(w, "메뉴 이름이 비어 있습니다.");
      if (m.children.length) {
        if (!blank(m.to) && !isLink(m.to)) add(w, "링크는 / 또는 https:// 로 시작해야 합니다.");
      } else if (!isLink(m.to)) add(w, "링크가 비어 있거나 올바르지 않습니다. (하위 메뉴가 없으면 링크가 필요해요)");
      m.children.forEach((c, ci) => {
        const cw = `${w} › '${c.label || ci + 1 + "번째 하위"}'`;
        if (blank(c.label)) add(cw, "하위 메뉴 이름이 비어 있습니다.");
        if (!isLink(c.to)) add(cw, "링크가 비어 있거나 올바르지 않습니다.");
      });
    });
  }
  if (key === "quote") {
    if (blank(d.title)) add("간편 견적", "제목이 비어 있습니다.");
    if (blank(d.ctaLabel)) add("간편 견적", "상담 신청 버튼 문구가 비어 있습니다.");
    Object.values(d.services).some(blank) && add("간편 견적 › 가입 서비스", "서비스 이름이 비어 있습니다.");
    Object.entries(d.speeds).forEach(([s, v]) => blank(v.short) && add(`간편 견적 › 속도 ${s}`, "짧은 설명이 비어 있습니다."));
    if (blank(d.mobileNo) || blank(d.mobileYes)) add("간편 견적 › 휴대폰 결합", "선택지 이름이 비어 있습니다.");
  }
  if (key === "benefits") {
    if (blank(d.title)) add("혜택 강조", "제목이 비어 있습니다.");
    if (d.items.length < 2) add("혜택 강조", "강조 문구는 2개 이상이어야 합니다.");
    d.items.forEach((it, i) => blank(it.title) && add(`혜택 강조 ${i + 1}`, "제목이 비어 있습니다."));
    d.promos.forEach((p, i) => blank(p.text) && add(`혜택 안내 문구 ${i + 1}`, "문구가 비어 있습니다."));
  }
  return out;
}

/** 저장 전 정리: 여러 줄 안내 문구의 빈 줄 제거 */
export function tidy(key, d) {
  if (key !== "plans") return d;
  const lines = (a) => (a || []).map((s) => s.trim()).filter(Boolean);
  return {
    carriers: d.carriers.map((c) => ({
      ...c,
      highlights: lines(c.highlights),
      priceTable: { ...c.priceTable, notes: lines(c.priceTable.notes) },
      discountTables: c.discountTables.map((t) => ({
        ...t,
        notes: lines(t.notes),
        boxesTop: (t.boxesTop || []).map(tidyBox),
        boxes: (t.boxes || []).map(tidyBox),
      })),
    })),
  };
}
function tidyBox(b) {
  const out = { title: b.title };
  if (b.items) out.items = b.items;
  if (b.bullets) out.bullets = b.bullets.map((s) => s.trim()).filter(Boolean);
  if (b.note?.trim()) out.note = b.note.trim();
  return out;
}
