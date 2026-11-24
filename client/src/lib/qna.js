// 고객센터 질문/답변 (공개)
export const QNA_STATUS_LABEL = { waiting: "답변대기", answered: "답변완료" };
export const QNA_FIELDS = [["title", "제목"], ["content", "내용"], ["author", "작성자"]];

/** 글에 전화번호처럼 보이는 숫자가 있는지 (작성 시 안내용) */
export const looksLikePhone = (s) => /(?<!\d)0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}(?!\d)/.test(String(s || ""));
/** 링크가 있는지 (있으면 검토 후 공개 — 서버와 같은 규칙) */
export const looksLikeLink = (s) =>
  /(https?:\/\/|www\.)\S|[a-z0-9-]+\.(com|net|org|kr|io|me|ly|xyz|shop|site|top|info|biz|link|gg|co|to|cc|app)(?![a-z])/i.test(String(s || ""));

export const fmtQnaDate = (d) => (d ? String(d).slice(0, 10).replaceAll("-", ".") : "");
