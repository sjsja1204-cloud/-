import { useState } from "react";
import { formatWon } from "../../lib/format";
import { useSiteData, hasPlanData } from "../../lib/siteData";
import "./plan-tables.css";

export function PriceTable({ table }) {
  // 가장 저렴한 요금 강조
  const nums = table.rows.flatMap((r) => r.prices).filter((v) => typeof v === "number");
  const min = nums.length ? Math.min(...nums) : null;
  return (
    <section className="pt-section">
      <h3 className="pt-title">{table.title}</h3>
      {table.desc && <p className="pt-desc">{table.desc}</p>}
      <div className="pt-scroll">
        <table className="pt-table">
          <thead>
            <tr>
              <th>인터넷 \ TV</th>
              {table.tvPlans.map((tv, i) => (
                <th key={i}>{tv}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, ri) => (
              <tr key={ri}>
                <td className="pt-rowhead">{row.internet}</td>
                {row.prices.map((p, i) => (
                  <td key={i} className={p === min ? "pt-best" : ""}>
                    {formatWon(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.notes?.filter(Boolean).map((n, i) => (
        <p key={i} className="pt-note">※ {n}</p>
      ))}
    </section>
  );
}

function InfoBox({ box }) {
  return (
    <div className="pt-box">
      <h4>{box.title}</h4>
      {box.items && (
        <dl>
          {box.items.map(([k, v], i) => (
            <div key={i} className="pt-box-row">
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {box.bullets && (
        <ul>
          {box.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
      {box.note && <p className="pt-note">* {box.note}</p>}
    </div>
  );
}

export function DiscountTable({ table }) {
  return (
    <section className="pt-section">
      <h3 className="pt-title">{table.title}</h3>
      {table.desc && <p className="pt-desc">{table.desc}</p>}
      {table.boxesTop?.length > 0 && (
        <div className="pt-boxes">
          {table.boxesTop.map((b, i) => (
            <InfoBox key={i} box={b} />
          ))}
        </div>
      )}
      <div className="pt-scroll">
        <table className="pt-table">
          <thead>
            <tr>
              {table.columns.map((c, i) => (
                <th key={i}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} className={ci === 0 ? "pt-rowhead" : ""}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.notes?.filter(Boolean).map((n, i) => (
        <p key={i} className="pt-note">※ {n}</p>
      ))}
      {table.boxes?.length > 0 && (
        <div className="pt-boxes">
          {table.boxes.map((b, i) => (
            <InfoBox key={i} box={b} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function PlanTables() {
  const { carriers: all } = useSiteData();
  const carriers = all.filter(hasPlanData); // 요금 준비중인 통신사는 비교표에서 제외
  const [active, setActive] = useState(null);
  const carrier = carriers.find((c) => c.id === active) || carriers[0];
  if (!carrier) return <p className="hint">요금표를 불러오는 중…</p>;

  return (
    <div className="pt-wrap">
      <div className="pt-tabs" role="tablist">
        {carriers.map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={c.id === carrier.id}
            className={c.id === carrier.id ? "pt-tab active" : "pt-tab"}
            onClick={() => setActive(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>
      <PriceTable table={carrier.priceTable} />
      {carrier.discountTables.map((t, i) => (
        <DiscountTable key={i} table={t} />
      ))}
    </div>
  );
}
