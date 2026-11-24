import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import SiteLayout from "../../components/site/SiteLayout";
import PageHero from "../../components/site/PageHero";
import Pager from "../../components/site/Pager";
import Icon from "../../components/site/Icon";
import { api, qs } from "../../lib/api";
import { QNA_STATUS_LABEL, QNA_FIELDS, fmtQnaDate } from "../../lib/qna";
import { csTabs } from "./csTabs";
import "./qna.css";

/**
 * 고객센터 > 질문/답변 목록 (/support/qna)
 * 검색(제목/내용/작성자) · 정렬(최신/조회) · 20개씩 · 공지 맨 위 · 모바일은 카드 목록
 */
export default function QnaListPage() {
  const [sp, setSp] = useSearchParams();
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const sort = sp.get("sort") === "views" ? "views" : "latest";
  const field = QNA_FIELDS.some(([k]) => k === sp.get("field")) ? sp.get("field") : "title";
  const q = sp.get("q") || "";
  const [form, setForm] = useState({ field, q });
  const [data, setData] = useState({ items: [], notices: [], total: 0, pageSize: 20, loading: true, error: "" });

  useEffect(() => setForm({ field, q }), [field, q]);
  useEffect(() => {
    let alive = true;
    setData((d) => ({ ...d, loading: true }));
    api(`/public/qna${qs({ page, sort, field: q ? field : "", q })}`)
      .then((d) => alive && setData({ ...d, loading: false, error: "" }))
      .catch((e) => alive && setData((d) => ({ ...d, loading: false, error: e.message })));
    return () => { alive = false; };
  }, [page, sort, field, q]);

  const go = (patch) => {
    const next = { page, sort, field, q, ...patch };
    setSp(Object.fromEntries(Object.entries({ ...next, page: next.page > 1 ? next.page : "", sort: next.sort === "views" ? "views" : "", field: next.q ? next.field : "" })
      .filter(([, v]) => v !== "" && v != null).map(([k, v]) => [k, String(v)])));
  };
  const search = (e) => {
    e.preventDefault();
    go({ field: form.field, q: form.q.trim(), page: 1 });
  };

  const num = (i) => data.total - (page - 1) * data.pageSize - i;
  const rows = [...data.notices.map((p) => ({ ...p, no: null })), ...data.items.map((p, i) => ({ ...p, no: num(i) }))];

  return (
    <SiteLayout title="질문/답변">
      <PageHero title="고객센터" crumbs={[["고객센터", "/support"], ["질문/답변"]]} tabs={csTabs} />
      <section className="sec">
        <div className="site-inner">
          <div className="qna-head">
            <div>
              <h2>질문/답변</h2>
              <p>가입·요금·설치 등 궁금한 점을 남겨 주시면 담아가넷이 답변드려요. 로그인 없이 쓸 수 있어요.</p>
            </div>
            <Link to="/support/qna/write" className="btn btn-primary"><Icon name="pencil" size={18} /> 질문하기</Link>
          </div>

          <form className="qna-search" onSubmit={search} role="search">
            <select className="select" value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} aria-label="검색 대상">
              {QNA_FIELDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <input className="input" value={form.q} maxLength={50} placeholder="검색어를 입력하세요" aria-label="검색어" onChange={(e) => setForm({ ...form, q: e.target.value })} />
            <button className="btn btn-dark"><Icon name="search" size={18} /> 검색</button>
          </form>

          <div className="qna-bar">
            <div className="qna-sort" role="group" aria-label="정렬">
              {[["latest", "최신순"], ["views", "조회순"]].map(([k, l]) => (
                <button key={k} type="button" className={sort === k ? "on" : ""} aria-pressed={sort === k} onClick={() => go({ sort: k, page: 1 })}>{l}</button>
              ))}
            </div>
            <span className="qna-total">
              {q && <><button type="button" className="qna-clear" onClick={() => go({ q: "", page: 1 })}>'{q}' 검색 해제</button> · </>}
              총 <b>{data.total.toLocaleString("ko-KR")}</b>건
            </span>
          </div>

          {/* PC: 표 */}
          <table className="qna-table">
            <thead>
              <tr><th className="c-no">번호</th><th>제목</th><th className="c-author">작성자</th><th className="c-date">날짜</th><th className="c-views">조회</th></tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className={p.isNotice ? "is-notice" : ""}>
                  <td className="c-no">{p.isNotice ? <span className="qna-badge notice">공지</span> : p.no}</td>
                  <td className="c-title"><TitleCell p={p} /></td>
                  <td className="c-author">{p.author}</td>
                  <td className="c-date">{fmtQnaDate(p.date)}</td>
                  <td className="c-views">{p.views.toLocaleString("ko-KR")}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 모바일: 카드 */}
          <ul className="qna-cards">
            {rows.map((p) => (
              <li key={p.id} className={p.isNotice ? "is-notice" : ""}>
                <Link to={`/support/qna/${p.id}`}>
                  <span className="qna-cards-top">
                    {p.isNotice ? <span className="qna-badge notice">공지</span> : <StatusBadge s={p.status} />}
                    {p.isSecret && <Icon name="lock" size={15} className="qna-lock" />}
                    {p.isNew && <span className="qna-new">NEW</span>}
                  </span>
                  <b className="qna-cards-title">{p.title}{p.answers > 0 && <span className="qna-count">[{p.answers}]</span>}</b>
                  <span className="qna-cards-meta">{p.author} · {fmtQnaDate(p.date)} · 조회 {p.views.toLocaleString("ko-KR")}</span>
                </Link>
              </li>
            ))}
          </ul>

          {!rows.length && (
            <div className="empty-box">
              {data.loading ? "불러오는 중…" : data.error || (q ? "검색 결과가 없습니다." : "아직 등록된 질문이 없습니다. 첫 질문을 남겨 보세요.")}
            </div>
          )}
          <Pager page={page} total={data.total} pageSize={data.pageSize} onChange={(p) => go({ page: p })} />
        </div>
      </section>
    </SiteLayout>
  );
}

function StatusBadge({ s }) {
  return <span className={`qna-badge ${s === "answered" ? "done" : "wait"}`}>{QNA_STATUS_LABEL[s] || "답변대기"}</span>;
}

function TitleCell({ p }) {
  return (
    <Link to={`/support/qna/${p.id}`} className="qna-title">
      {!p.isNotice && <StatusBadge s={p.status} />}
      {p.isSecret && <Icon name="lock" size={15} className="qna-lock" />}
      {p.isSecret && <span className="sr-only">비밀글</span>}
      <span className="qna-title-text">{p.title}</span>
      {p.answers > 0 && <span className="qna-count" aria-label={`답변 ${p.answers}개`}>[{p.answers}]</span>}
      {p.isNew && <span className="qna-new">NEW</span>}
    </Link>
  );
}
