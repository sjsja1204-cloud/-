import { useEffect, useState } from "react";
import { api } from "../../lib/api";

let statusCache = null;

/** 관리자 > 사이트 설정에서 상태값을 바꾼 뒤 호출 */
export const clearStatusCache = () => {
  statusCache = null;
};

/** 선택 버튼용: 숨긴 상태는 빼되, 지금 값이면 남김 */
export const selectableStatuses = (statuses, current) => statuses.filter((s) => !s.is_hidden || s.id === current);

/** 상태값 목록 (DB lead_statuses 테이블 기준, 숨김 포함 — 표시용) */
export function useStatuses() {
  const [statuses, setStatuses] = useState(statusCache || []);
  useEffect(() => {
    if (statusCache) return;
    api("/meta/statuses").then(({ statuses }) => {
      statusCache = statuses;
      setStatuses(statuses);
    }).catch(() => {});
  }, []);
  return statuses;
}

export function StatusBadge({ name, isFinal }) {
  return <span className={`badge ${isFinal ? "badge-final" : name === "신규" ? "badge-accent" : ""}`}>{name}</span>;
}
