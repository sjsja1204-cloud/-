import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSiteData } from "../../lib/siteData";
import Icon from "./Icon";

/** 메인 슬라이드 배너 (5초 자동 전환, 스와이프, 좌우 버튼) */
export default function HeroSlider() {
  const { hero, status } = useSiteData();
  const banners = hero.banners;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef(null);
  const n = banners.length;
  const go = (k) => setI(((k % n) + n) % n);

  useEffect(() => {
    if (paused || n < 2) return;
    const t = setTimeout(() => go(i + 1), 5000);
    return () => clearTimeout(t);
  }, [i, paused, n]);
  useEffect(() => {
    if (i >= n) setI(0);
  }, [i, n]);

  if (!n) return <section className="hs"><div className="hs-slide theme-orange" aria-busy={status === "loading"} /></section>;

  return (
    <section className="hs" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
        touch.current = null;
      }}
      aria-roledescription="carousel" aria-label="이벤트 배너">
      <div className="hs-track" style={{ transform: `translateX(-${i * 100}%)` }}>
        {banners.map((b, k) => (
          <div key={k} className={`hs-slide theme-${b.theme} ${b.image ? "has-bg" : ""}`} aria-hidden={k !== i}
            style={b.image ? { "--bg-img": `url(${JSON.stringify(b.image)})` } : undefined}>
            <div className="site-inner hs-inner">
              <div className="hs-copy">
                {b.kicker && <p className="hs-kicker">{b.kicker}</p>}
                <h2>{b.title.split("\n").map((l, j) => <span key={j}>{l}<br /></span>)}</h2>
                {b.desc && <p className="hs-desc">{b.desc}</p>}
                <Link to={b.cta.to} className="btn btn-lg hs-cta" tabIndex={k === i ? 0 : -1}>
                  {b.cta.label} <Icon name="chevronRight" size={18} />
                </Link>
              </div>
              {!b.image && <HeroArt theme={b.theme} />}
            </div>
          </div>
        ))}
      </div>
      {n > 1 && (
        <div className="site-inner hs-ctrl">
          <button aria-label="이전 배너" onClick={() => go(i - 1)}><Icon name="chevronLeft" size={18} /></button>
          <span className="hs-count"><b>{i + 1}</b> / {n}</span>
          <button aria-label="다음 배너" onClick={() => go(i + 1)}><Icon name="chevronRight" size={18} /></button>
          <div className="hs-dots">
            {banners.map((_, k) => <button key={k} className={k === i ? "on" : ""} aria-label={`${k + 1}번 배너`} onClick={() => go(k)} />)}
          </div>
        </div>
      )}
    </section>
  );
}

/** 이미지가 없을 때 쓰는 장식 그래픽 */
function HeroArt({ theme }) {
  const icons = theme === "navy" ? ["phone", "link", "wifi"] : theme === "mint" ? ["headset", "check", "calc"] : ["wifi", "tv", "gift"];
  return (
    <div className="hs-art" aria-hidden>
      <img src="/logo.png" alt="" className="hs-art-house" />
      {icons.map((ic, k) => (
        <span key={ic} className={`hs-bubble b${k}`}><Icon name={ic} size={26} /></span>
      ))}
    </div>
  );
}
