import { useEffect, useState } from "react";
import { api, qs } from "./api";

export const BOARD_LABEL = { notice: "공지사항", event: "이벤트", review: "상담후기", faq: "자주 묻는 질문" };

/** 공개 게시판 목록 */
export function usePosts(board, { page = 1, pageSize = 10 } = {}) {
  const [state, setState] = useState({ items: [], total: 0, loading: true, error: "" });
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    api(`/public/posts${qs({ board, page, pageSize })}`)
      .then((d) => alive && setState({ items: d.items, total: d.total, loading: false, error: "" }))
      .catch((e) => alive && setState({ items: [], total: 0, loading: false, error: e.message }));
    return () => { alive = false; };
  }, [board, page, pageSize]);
  return state;
}

export const fmtDay = (d) => (d ? new Date(d).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }).replaceAll("-", ".") : "");
