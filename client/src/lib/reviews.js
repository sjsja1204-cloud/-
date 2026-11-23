import { useCallback, useEffect, useState } from "react";
import { api, qs } from "./api";

/** 공개 후기 목록 (관리자가 등록한 실제 고객 후기). 통신사 필터 + 더보기 */
export function useReviews({ carrier = "", pageSize = 10 } = {}) {
  const [state, setState] = useState({ items: [], total: 0, carriers: [], loading: true, error: "" });
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, items: [], loading: true }));
    api(`/public/reviews${qs({ carrier, offset: 0, limit: pageSize })}`)
      .then((d) => alive && setState({ items: d.items, total: d.total, carriers: d.carriers, loading: false, error: "" }))
      .catch((e) => alive && setState((s) => ({ ...s, loading: false, error: e.message })));
    return () => { alive = false; };
  }, [carrier, pageSize]);

  const more = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    api(`/public/reviews${qs({ carrier, offset: state.items.length, limit: pageSize })}`)
      .then((d) => setState((s) => ({ ...s, items: [...s.items, ...d.items], total: d.total, loading: false })))
      .catch((e) => setState((s) => ({ ...s, loading: false, error: e.message })));
  }, [carrier, pageSize, state.items.length]);

  return { ...state, more, hasMore: state.items.length < state.total };
}

/** 공개 자주 묻는 질문 (관리자 > 자주 묻는 질문) */
export function useFaqs() {
  const [state, setState] = useState({ items: [], categories: [], loading: true, error: "" });
  useEffect(() => {
    let alive = true;
    api("/public/faqs")
      .then((d) => alive && setState({ items: d.items, categories: d.categories, loading: false, error: "" }))
      .catch((e) => alive && setState((s) => ({ ...s, loading: false, error: e.message })));
    return () => { alive = false; };
  }, []);
  return state;
}

export const fmtDate = (d) => (d ? String(d).slice(0, 10).replaceAll("-", ".") : "");
