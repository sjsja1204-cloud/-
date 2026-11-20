import Icon from "./Icon";

export default function Pager({ page, total, pageSize, onChange }) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const go = (p) => {
    onChange(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const from = Math.max(1, Math.min(page - 2, pages - 4));
  const nums = Array.from({ length: Math.min(5, pages) }, (_, k) => from + k);
  return (
    <nav className="spager" aria-label="페이지">
      <button disabled={page <= 1} onClick={() => go(page - 1)} aria-label="이전 페이지"><Icon name="chevronLeft" size={16} /></button>
      {nums.map((n) => <button key={n} className={n === page ? "on" : ""} onClick={() => go(n)} aria-current={n === page ? "page" : undefined}>{n}</button>)}
      <button disabled={page >= pages} onClick={() => go(page + 1)} aria-label="다음 페이지"><Icon name="chevronRight" size={16} /></button>
    </nav>
  );
}
