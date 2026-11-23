import { selectableStatuses } from "../components/panel/hooks";
/** 상태 변경 버튼 묶음 (상태값은 DB 설정 테이블 기준) */
export default function StatusButtons({ statuses, value, onChange, disabled }) {
  return (
    <div className="status-buttons" role="group" aria-label="상태 변경">
      {selectableStatuses(statuses, value).map((s) => (
        <button key={s.id} className={`chip ${value === s.id ? "on" : ""}`} disabled={disabled} onClick={() => value !== s.id && onChange(s.id)}>
          {s.name}
        </button>
      ))}
    </div>
  );
}
