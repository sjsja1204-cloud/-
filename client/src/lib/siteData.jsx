// 사이트 공통 데이터 (요금표·메인 문구·사업자 정보·폼 선택지) — 관리자 페이지에서 바꾼 값을 API 로 받아 쓴다.
// 미리보기: 관리자가 ?preview=1 로 열면 이 탭에서만 임시저장본을 보여준다 (sessionStorage 에 표시).
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api";

const PREVIEW_KEY = "dg_preview";
const Ctx = createContext(null);

// 값이 오기 전/실패 시 화면이 깨지지 않도록 하는 최소값 (실제 내용은 DB 에 있음)
const EMPTY = {
  carriers: [],
  hero: { banners: [] },
  benefits: { kicker: "", title: "", items: [], promos: [] },
  business: { name: "담아가넷" },
  formOptions: { products: [], carriers: [] },
};

function readPreviewFlag() {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("preview") === "1") {
      sessionStorage.setItem(PREVIEW_KEY, "1");
      url.searchParams.delete("preview");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
    return sessionStorage.getItem(PREVIEW_KEY) === "1";
  } catch {
    return false;
  }
}

export function SiteDataProvider({ children }) {
  const [data, setData] = useState(EMPTY);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [preview, setPreview] = useState(readPreviewFlag);

  const load = useCallback(async () => {
    try {
      const [plans, site, settings] = await Promise.all([api("/plans"), api("/site"), api("/settings/public")]);
      let next = { carriers: plans.carriers, hero: site.hero, benefits: site.benefits, ...settings };
      if (preview) {
        try {
          const d = await api("/admin/content/preview");
          next = { ...next, carriers: d.plans.carriers.filter((c) => !c.hidden), hero: d.hero, benefits: d.benefits };
        } catch {
          // 관리자 로그인이 아니면 미리보기 해제
          sessionStorage.removeItem(PREVIEW_KEY);
          setPreview(false);
        }
      }
      setData(next);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [preview]);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo(
    () => ({
      ...data,
      status,
      preview,
      reload: load,
      exitPreview: () => {
        sessionStorage.removeItem(PREVIEW_KEY);
        setPreview(false);
      },
    }),
    [data, status, preview, load]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSiteData = () => useContext(Ctx);

/** 통신사 최저 요금 */
export const minPrice = (c) => {
  const all = c.priceTable.rows.flatMap((r) => r.prices).filter((v) => typeof v === "number");
  return all.length ? Math.min(...all) : null;
};

/** 상단 메뉴: 인터넷·TV 하위 메뉴는 공개된 통신사로 구성 */
export function buildMenu(menu, carriers) {
  return menu.map((m) =>
    m.to === "/internet"
      ? { ...m, children: [{ label: "통신사 한눈에 비교", to: "/internet" }, ...carriers.map((c) => ({ label: c.name, to: `/internet/${c.id}` }))] }
      : m
  );
}
