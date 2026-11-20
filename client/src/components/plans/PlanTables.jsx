import { useState } from "react";
import { carriers, formatWon } from "./telecomPlans";
import "./plan-tables.css";

export function PriceTable({ table }) {
  // 가장 저렴한 요금 강조
  const min = Math.min(...table.rows.flatMap((r) => r.prices));
  return (
    <section className="pt-section">
      <h3 className="pt-title">{table.title}</h3>
      {table.desc && <p className="pt-desc">{table.desc}</p>}
      <div className="pt-scroll">
        <table className="pt-table">
          <thead>
            <tr>
              <th>인터넷 \ TV</th>
              {table.tvPlans.map((tv) => (
                <th key={tv}>{tv}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row.internet}>
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
      {table.notes?.map((n) => (
        <p key={n} className="pt-note">※ {n}</p>
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
          {box.items.map(([k, v]) => (
            <div key={k} className="pt-box-row">
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {box.bullets && (
        <ul>
          {box.bullets.map((b) => (
            <li key={b}>{b}</li>
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
      {table.boxesTop && (
        <div className="pt-boxes">
          {table.boxesTop.map((b) => (
            <InfoBox key={b.title} box={b} />
          ))}
        </div>
      )}
      <div className="pt-scroll">
        <table className="pt-table">
          <thead>
            <tr>
              {table.columns.map((c) => (
                <th key={c}>{c}</th>
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
      {table.notes?.map((n) => (
        <p key={n} className="pt-note">※ {n}</p>
      ))}
      {table.boxes && (
        <div className="pt-boxes">
          {table.boxes.map((b) => (
            <InfoBox key={b.title} box={b} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function PlanTables() {
  const [active, setActive] = useState(carriers[0].id);
  const carrier = carriers.find((c) => c.id === active);

  return (
    <div className="pt-wrap">
      <div className="pt-tabs" role="tablist">
        {carriers.map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={c.id === active}
            className={c.id === active ? "pt-tab active" : "pt-tab"}
            onClick={() => setActive(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>
      <PriceTable table={carrier.priceTable} />
      {carrier.discountTables.map((t) => (
        <DiscountTable key={t.title} table={t} />
      ))}
    </div>
  );
}
