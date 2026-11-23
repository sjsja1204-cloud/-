import { moveItem, removeAt, setAt } from "./useContentEditor";

export const SPEEDS = ["100M", "200M", "500M", "1G"];

const fmt = (v) => (v == null ? "" : v.toLocaleString("ko-KR"));
const toNum = (s) => {
  const d = s.replace(/[^\d]/g, "").slice(0, 8); // 숫자 외 입력 차단
  return d === "" ? null : Number(d);
};

/**
 * 요금표 편집: 표 모양 그대로. 가로 = TV 상품(열), 세로 = 인터넷 상품(행), 칸 = 월 요금(숫자)
 * table: { tvPlans: string[], rows: [{ internet, speed, internetOnly, prices: (number|null)[] }] }
 * speed·internetOnly 는 메인 '간편 견적'에 쓰인다 (속도 분류가 없는 행은 견적에 안 나옴)
 */
export default function PriceGrid({ table, onChange }) {
  const { tvPlans, rows } = table;
  const set = (patch) => onChange({ ...table, ...patch });

  const addCol = () => set({ tvPlans: [...tvPlans, ""], rows: rows.map((r) => ({ ...r, prices: [...r.prices, null] })) });
  const delCol = (ci) => {
    if (!confirm(`'${tvPlans[ci] || ci + 1 + "번째"}' 열(TV 상품)과 그 요금을 지울까요?\n\n삭제해도 '이전 버전'에서 되돌릴 수 있어요.`)) return;
    set({ tvPlans: removeAt(tvPlans, ci), rows: rows.map((r) => ({ ...r, prices: removeAt(r.prices, ci) })) });
  };
  const moveCol = (ci, d) => set({ tvPlans: moveItem(tvPlans, ci, d), rows: rows.map((r) => ({ ...r, prices: moveItem(r.prices, ci, d) })) });

  const addRow = () => set({ rows: [...rows, { internet: "", speed: null, internetOnly: null, prices: tvPlans.map(() => null) }] });
  const delRow = (ri) => {
    if (!confirm(`'${rows[ri].internet || ri + 1 + "번째"}' 행(인터넷 상품)과 그 요금을 지울까요?\n\n삭제해도 '이전 버전'에서 되돌릴 수 있어요.`)) return;
    set({ rows: removeAt(rows, ri) });
  };
  const moveRow = (ri, d) => set({ rows: moveItem(rows, ri, d) });
  const setCell = (ri, ci, v) => set({ rows: setAt(rows, ri, { ...rows[ri], prices: setAt(rows[ri].prices, ci, v) }) });

  return (
    <div className="grid-wrap">
      <table className="egrid">
        <thead>
          <tr>
            <th className="corner">인터넷 ↓ \ TV →</th>
            {tvPlans.map((t, ci) => (
              <th key={ci}>
                <input className={`cell head ${!t.trim() ? "bad" : ""}`} value={t} placeholder="TV 상품명" maxLength={50}
                  onChange={(e) => set({ tvPlans: setAt(tvPlans, ci, e.target.value) })} />
                <span className="cell-tools">
                  <button type="button" disabled={ci === 0} onClick={() => moveCol(ci, -1)} aria-label="왼쪽으로">◀</button>
                  <button type="button" disabled={ci === tvPlans.length - 1} onClick={() => moveCol(ci, 1)} aria-label="오른쪽으로">▶</button>
                  <button type="button" className="danger" onClick={() => delCol(ci)} aria-label="열 삭제">✕</button>
                </span>
              </th>
            ))}
            <th className="addcol"><button type="button" className="btn btn-sm" onClick={addCol} disabled={tvPlans.length >= 10}>+ TV 상품(열)</button></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              <th>
                <input className={`cell head ${!r.internet.trim() ? "bad" : ""}`} value={r.internet} placeholder="인터넷 상품명" maxLength={50}
                  onChange={(e) => set({ rows: setAt(rows, ri, { ...r, internet: e.target.value }) })} />
                <span className="row-quote">
                  <select className="cell sub" value={r.speed || ""} aria-label={`${r.internet || ri + 1 + "행"} 속도 분류`}
                    onChange={(e) => set({ rows: setAt(rows, ri, { ...r, speed: e.target.value || null }) })}>
                    <option value="">속도 분류 없음</option>
                    {SPEEDS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <span className="won">
                    <input className="cell num sub" inputMode="numeric" value={fmt(r.internetOnly ?? null)} placeholder="단독 요금"
                      aria-label={`${r.internet || ri + 1 + "행"} 인터넷 단독 월요금`}
                      onChange={(e) => set({ rows: setAt(rows, ri, { ...r, internetOnly: toNum(e.target.value) }) })} />
                    <i>원</i>
                  </span>
                </span>
                <span className="cell-tools">
                  <button type="button" disabled={ri === 0} onClick={() => moveRow(ri, -1)} aria-label="위로">▲</button>
                  <button type="button" disabled={ri === rows.length - 1} onClick={() => moveRow(ri, 1)} aria-label="아래로">▼</button>
                  <button type="button" className="danger" onClick={() => delRow(ri)} aria-label="행 삭제">✕</button>
                </span>
              </th>
              {tvPlans.map((_, ci) => {
                const v = r.prices[ci] ?? null;
                return (
                  <td key={ci}>
                    <span className="won">
                      <input className={`cell num ${v == null ? "bad" : ""}`} inputMode="numeric" value={fmt(v)} placeholder="빈칸"
                        aria-label={`${r.internet || ri + 1 + "행"} ${tvPlans[ci] || ci + 1 + "열"} 요금`}
                        onChange={(e) => setCell(ri, ci, toNum(e.target.value))} />
                      <i>원</i>
                    </span>
                  </td>
                );
              })}
              <td />
            </tr>
          ))}
          <tr>
            <th><button type="button" className="btn btn-sm" onClick={addRow} disabled={rows.length >= 20}>+ 인터넷 상품(행)</button></th>
            <td colSpan={tvPlans.length + 1} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
