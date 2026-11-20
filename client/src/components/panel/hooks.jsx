import { useEffect, useState } from "react";
import { api } from "../../lib/api";

let statusCache = null;

/** 상태값 목록 (DB lead_statuses 테이블 기준) */
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
