import { useEffect, useRef, useState } from "react";
import { useSiteData } from "../../lib/siteData";
import { SERVICE_KEYS, speedsOf, estimate, isOpenNow } from "../../lib/quote";
import { formatWon } from "../../lib/format";
import CarrierChip from "./CarrierChip";
import Icon from "./Icon";

/**
 * 간편 견적 (메인 배너 바로 아래). 통신사 → 가입 서비스 → 속도 → 휴대폰 결합 → 예상 월요금.
 * 요금: 관리자 > 요금표 (행별 속도 분류·인터넷 단독 요금), 문구: 관리자 > 메인 화면 > 간편 견적
 */
export default function QuoteWidget() {
  const { quote: t, carriers, business, openConsult } = useSiteData();
  const [carrierId, setCarrierId] = useState(null);
  const [service, setService] = useState(null);
  const [speed, setSpeed] = useState(null);
  const [mobile, setMobile] = useState(null); // true | false | null
  const [tip, setTip] = useState(null);
  const [open, setOpen] = useState(() => isOpenNow(business));

  useEffect(() => {
    setOpen(isOpenNow(business));
    const id = setInterval(() => setOpen(isOpenNow(business)), 60_000);
    return () => clearInterval(id);
  }, [business]);

  // 견적 가능한 통신사만 (속도 분류가 1개 이상 있는 곳)
  const list = carriers.filter((c) => speedsOf(c).length);
  const carrier = list.find((c) => c.id === carrierId) || null;
  const speeds = carrier ? speedsOf(carrier) : [];

  // 통신사를 바꿨는데 그 통신사에 없는 속도면 선택 해제
  useEffect(() => {
    if (speed && !speeds.includes(speed)) setSpeed(null);
  }, [carrierId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!t.enabled || !list.length) return null;

  const ready = carrier && service && speed && mobile !== null;
  const est = ready ? estimate(carrier, service, speed) : null;

  const apply = () =>
    openConsult("quote", {
      carrier: carrier.id, carrierName: carrier.name, service, serviceLabel: t.services[service], speed,
      mobileBundle: mobile, mobileLabel: t.mobileYes, price: est?.price ?? null, from: est?.from,
    });

  return (
    <section className="qw-sec" id="quote" aria-labelledby="qw-title">
      <div className="site-inner">
        <div className="qw">
          <header className="qw-head">
            <div>
              {t.kicker && <p className="qw-kicker">{t.kicker}</p>}
              <h2 id="qw-title">{t.title}</h2>
              {t.desc && <p className="qw-desc">{t.desc}</p>}
            </div>
            {open && t.liveBadge && <span className="qw-live"><i aria-hidden />{t.liveBadge}</span>}
          </header>

          <div className="qw-body">
            <div className="qw-steps">
              <Step n={1} title="통신사">
                <Scroller>
                  {list.map((c) => <CarrierChip key={c.id} carrier={c} selected={c.id === carrierId} onSelect={setCarrierId} />)}
                </Scroller>
              </Step>

              <Step n={2} title="가입 서비스">
                <div className="qw-opts">
                  {SERVICE_KEYS.map((k) => (
                    <button key={k} type="button" className={`qw-opt ${service === k ? "on" : ""}`} aria-pressed={service === k} onClick={() => setService(k)}>
                      {t.services[k]}
                    </button>
                  ))}
                </div>
                {service === "internet_tv_usim" && t.usimNotice && (
                  <p className="qw-notice"><Icon name="info" size={16} />{t.usimNotice}</p>
                )}
              </Step>

              <Step n={3} title="인터넷 속도">
                {!carrier ? (
                  <p className="qw-wait">통신사를 먼저 골라 주세요.</p>
                ) : (
                  <div className="qw-opts speeds">
                    {speeds.map((s) => {
                      const info = t.speeds[s] || {};
                      return (
                        <div key={s} className="qw-speed">
                          <button type="button" className={`qw-opt ${speed === s ? "on" : ""}`} aria-pressed={speed === s} onClick={() => setSpeed(s)}>
                            <b>{s}</b>
                            {info.short && <small>{info.short}</small>}
                          </button>
                          {info.detail && (
                            <span className={`qw-tip ${tip === s ? "show" : ""}`}>
                              <button type="button" className="qw-q" aria-label={`${s} 자세한 설명`} aria-expanded={tip === s}
                                aria-describedby={`qw-tip-${s}`} onClick={() => setTip(tip === s ? null : s)} onBlur={() => setTip(null)}>
                                ?
                              </button>
                              <span role="tooltip" id={`qw-tip-${s}`}>{info.detail}</span>
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Step>

              <Step n={4} title="휴대폰 결합">
                <div className="qw-opts">
                  {[[false, t.mobileNo], [true, t.mobileYes]].map(([v, l]) => (
                    <button key={String(v)} type="button" className={`qw-opt ${mobile === v ? "on" : ""}`} aria-pressed={mobile === v} onClick={() => setMobile(v)}>
                      {l}
                    </button>
                  ))}
                </div>
              </Step>
            </div>

            <div className={`qw-result ${ready ? "ready" : ""}`} aria-live="polite">
              {ready ? (
                <>
                  <p className="qw-sum">{[carrier.name, t.services[service], speed, mobile ? t.mobileYes : null].filter(Boolean).join(" · ")}</p>
                  <p className="qw-price-label">예상 월 요금</p>
                  {est ? (
                    <p className="qw-price"><b>{formatWon(est.price)}</b>{est.from && <span>부터</span>}</p>
                  ) : (
                    <p className="qw-price ask"><b>상담 시 안내</b></p>
                  )}
                  {mobile && t.mobileNote && <p className="qw-note strong">{t.mobileNote}</p>}
                  {service === "internet_tv_usim" && <p className="qw-note">유심 통신요금은 별도입니다.</p>}
                  {t.resultNote && <p className="qw-note">{t.resultNote}</p>}
                  <button type="button" className="btn btn-primary btn-lg btn-block" onClick={apply}>{t.ctaLabel}</button>
                </>
              ) : (
                <div className="qw-empty">
                  <Icon name="calc" size={30} />
                  <p>왼쪽 4가지를 고르면<br />예상 월 요금이 바로 나와요.</p>
                  <ol className="qw-progress" aria-label="선택 진행">
                    {[carrier, service, speed, mobile !== null].map((v, i) => <li key={i} className={v ? "done" : ""} />)}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Step({ n, title, children }) {
  return (
    <div className="qw-step">
      <p className="qw-step-title"><span>{n}</span>{title}</p>
      {children}
    </div>
  );
}

/** 통신사가 많으면 가로 스크롤 + 좌우 화살표 */
function Scroller({ children }) {
  const ref = useRef(null);
  const [edge, setEdge] = useState({ left: false, right: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setEdge({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    check();
    el.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [children]);
  const go = (d) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.7, behavior: "smooth" });
  return (
    <div className="qw-scroll">
      {edge.left && <button type="button" className="qw-arrow l" onClick={() => go(-1)} aria-label="이전 통신사"><Icon name="chevronLeft" size={18} /></button>}
      <div className="qw-chips" ref={ref}>{children}</div>
      {edge.right && <button type="button" className="qw-arrow r" onClick={() => go(1)} aria-label="다음 통신사"><Icon name="chevronRight" size={18} /></button>}
    </div>
  );
}
