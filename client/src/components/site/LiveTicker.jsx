import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { ticker } from "../../config/site";
import { useSiteData } from "../../lib/siteData";

const ago = (d) => {
  const m = Math.max(0, Math.floor((Date.now() - new Date(d)) / 60000));
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
};

/**
 * 실시간 상담 현황 — 위로 한 줄씩 슬라이드.
 * 실제 접수(이름 가림)만 표시하고, 최근 접수가 적으면 혜택 안내 문구로 대체한다.
 */
export default function LiveTicker({ rows = 4 }) {
  const { benefits, status } = useSiteData();
  const [real, setReal] = useState(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    api("/public/ticker").then((d) => setReal(d.items)).catch(() => setReal([]));
  }, []);

  const useReal = real && real.length >= ticker.minRealItems;
  const items = !real || (!useReal && status === "loading")
    ? []
    : useReal
      ? real.map((r) => ({
          tag: r.product,
          text: `${r.name} 님 · ${r.carrier ? r.carrier + " " : ""}${r.product} 상담 신청`,
          side: r.status,
          time: ago(r.createdAt),
        }))
      : benefits.promos.filter((p) => p.text).map((p) => ({ tag: p.tag, text: p.text }));

  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    if (items.length <= rows || reduced) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 2600);
    return () => clearInterval(t);
  }, [items.length, rows, reduced]);

  // 롤링: 직전 첫 줄부터 rows+1 줄을 그린 뒤 한 줄 높이만큼 위로 밀어 올림 → 끝 상태가 다음 목록의 시작과 같아 끊김 없음
  const rolling = items.length > rows && !reduced;
  const start = rolling ? (idx - 1 + items.length) % items.length : 0;
  const visible = items.length
    ? Array.from({ length: Math.min(rolling ? rows + 1 : rows, items.length) }, (_, k) => items[(start + k) % items.length])
    : [];

  return (
    <div className="ticker">
      <div className="ticker-head">
        <span className="ticker-dot" aria-hidden />
        <b>{useReal ? "실시간 상담 신청 현황" : "지금 받을 수 있는 혜택"}</b>
      </div>
      <div className="ticker-window" style={{ "--rows": rows }} aria-live="off">
        <ul key={idx} className={`ticker-list ${rolling ? "roll" : ""}`}>
          {visible.map((it, k) => (
            <li key={k}>
              <span className="ticker-tag">{it.tag}</span>
              <span className="ticker-text">{it.text}</span>
              {it.side && <span className={`ticker-side ${it.side === "개통완료" ? "done" : ""}`}>{it.side}</span>}
              {it.time && <span className="ticker-time">{it.time}</span>}
            </li>
          ))}
        </ul>
        {real && !items.length && <p className="hint" style={{ padding: 12 }}>표시할 내용이 없습니다.</p>}
      </div>
      {useReal && <p className="ticker-foot">최근 30일 실제 신청 내역 · 개인정보 보호를 위해 이름 일부를 가렸습니다.</p>}
    </div>
  );
}
