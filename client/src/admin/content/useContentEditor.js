// 버전 관리 콘텐츠 편집 공통 상태: 불러오기 / 임시저장 / 미리보기 / 사이트에 반영 / 버전 되돌리기
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../lib/api";
import { useSiteData } from "../../lib/siteData";
import { findIssues, tidy } from "./issues";

export function useContentEditor(key) {
  const site = useSiteData();
  const [data, setData] = useState(null); // 편집 중인 내용
  const [meta, setMeta] = useState(null); // 서버 상태 (반영 시각, 반영 안 된 변경 여부)
  const [dirty, setDirty] = useState(false); // 임시저장 안 한 변경
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [serverIssues, setServerIssues] = useState([]);
  const saved = useRef(null);

  const load = useCallback(async () => {
    const d = await api(`/admin/content/${key}`);
    setData(d.draft);
    saved.current = JSON.stringify(d.draft);
    setMeta(d);
    setDirty(false);
    setServerIssues([]);
  }, [key]);

  useEffect(() => {
    load().catch((e) => setMsg({ err: true, text: e.message }));
  }, [load]);

  // 저장 안 한 채 창을 닫으면 경고
  useEffect(() => {
    if (!dirty) return;
    const h = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const update = useCallback((next) => {
    setData((prev) => {
      const v = typeof next === "function" ? next(prev) : next;
      setDirty(JSON.stringify(v) !== saved.current);
      return v;
    });
  }, []);

  const issues = useMemo(() => findIssues(key, data), [key, data]);

  const run = async (fn, okText) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      if (okText) setMsg({ text: okText });
      return true;
    } catch (e) {
      setServerIssues(e.data?.issues || []);
      setMsg({ err: true, text: e.message });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = () =>
    run(async () => {
      const clean = tidy(key, data);
      await api(`/admin/content/${key}/draft`, { method: "PUT", body: { data: clean } });
      await load();
    }, "임시저장했습니다. 아직 고객 화면에는 반영되지 않았어요.");

  const preview = async (path) => {
    // 미리보기 창이 막히지 않도록 클릭 즉시 창을 열고, 저장 후 주소를 넣는다
    const w = window.open("about:blank", "_blank");
    const ok = !dirty || (await saveDraft());
    if (!ok) return w?.close();
    if (w) w.location.href = `${path}${path.includes("?") ? "&" : "?"}preview=1`;
  };

  const publish = () =>
    run(async () => {
      await api(`/admin/content/${key}/publish`, { method: "POST", body: { data: tidy(key, data) } });
      await load();
      site.reload();
    }, "사이트에 반영했습니다. 고객 화면에 바로 보입니다.");

  const revert = (versionId) =>
    run(async () => {
      await api(`/admin/content/${key}/versions/${versionId}/revert`, { method: "POST" });
      await load();
      site.reload();
    }, "선택한 버전으로 되돌려 사이트에 반영했습니다.");

  const discard = async () => {
    await load();
    setMsg({ text: "임시저장된 내용으로 되돌렸습니다." });
  };

  return { data, update, meta, dirty, busy, msg, setMsg, issues, serverIssues, saveDraft, preview, publish, revert, discard };
}

/** 배열 유틸 */
export const moveItem = (arr, i, d) => {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};
export const removeAt = (arr, i) => arr.filter((_, k) => k !== i);
export const setAt = (arr, i, v) => arr.map((x, k) => (k === i ? v : x));
