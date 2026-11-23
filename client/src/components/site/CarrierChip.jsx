/**
 * 통신사 선택 칩: 이름 글자(중립 회색 테두리) + 선택 시 담아가넷 색.
 * 통신사 고유색은 쓰지 않는다. 로고는 관리자가 권한 있는 경우에만 등록.
 */
export default function CarrierChip({ carrier, selected, onSelect }) {
  return (
    <button type="button" className={`cchip ${selected ? "on" : ""}`} aria-pressed={selected} onClick={() => onSelect(carrier.id)}>
      {carrier.logo ? <img src={carrier.logo} alt="" /> : null}
      <span>{carrier.name}</span>
    </button>
  );
}
