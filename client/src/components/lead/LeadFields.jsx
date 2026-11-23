import { CALL_TIMES, hyphenPhone, isValidMobile } from "../../lib/format";
import { useSiteData } from "../../lib/siteData";

export const emptyLead = { name: "", phone: "", products: [], carrier: "", callTime: "", message: "" };

/** 입력값 검증 → { field: message } */
export function validateLead(v) {
  const e = {};
  if (!v.name.trim()) e.name = "이름을 입력해 주세요.";
  if (!isValidMobile(v.phone)) e.phone = "휴대폰 번호를 정확히 입력해 주세요.";
  if (!v.products.length) e.products = "관심 상품을 1개 이상 선택해 주세요.";
  if (!v.carrier) e.carrier = "희망 통신사를 선택해 주세요.";
  return e;
}

/** 고객 접수 폼 · 직원 직접 접수 폼 공용 입력 필드 */
export default function LeadFields({ value, onChange, errors = {}, idPrefix = "lead" }) {
  const { formOptions } = useSiteData();
  const PRODUCTS = formOptions.products;
  const CARRIERS = formOptions.carriers;
  const set = (k, v) => onChange({ ...value, [k]: v });
  const toggleProduct = (p) =>
    set("products", value.products.includes(p) ? value.products.filter((x) => x !== p) : [...value.products, p]);

  return (
    <>
      <div className="field">
        <label htmlFor={`${idPrefix}-name`}>이름<span className="req">*</span></label>
        <input id={`${idPrefix}-name`} className="input" value={value.name} maxLength={50} autoComplete="name"
          onChange={(e) => set("name", e.target.value)} placeholder="홍길동" />
        {errors.name && <span className="err">{errors.name}</span>}
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-phone`}>연락처<span className="req">*</span></label>
        <input id={`${idPrefix}-phone`} className="input" value={value.phone} inputMode="numeric" autoComplete="tel"
          onChange={(e) => set("phone", hyphenPhone(e.target.value))} placeholder="010-0000-0000" maxLength={13} />
        {errors.phone && <span className="err">{errors.phone}</span>}
      </div>

      <div className="field" role="group" aria-labelledby={`${idPrefix}-products-l`}>
        <span id={`${idPrefix}-products-l`} className="field-label">관심 상품<span className="req">*</span> <span className="hint">(복수 선택)</span></span>
        <div className="chips">
          {PRODUCTS.map((p) => (
            <label key={p} className={`chip ${value.products.includes(p) ? "on" : ""}`}>
              <input type="checkbox" checked={value.products.includes(p)} onChange={() => toggleProduct(p)} />
              {p}
            </label>
          ))}
        </div>
        {errors.products && <span className="err">{errors.products}</span>}
      </div>

      <div className="field" role="radiogroup" aria-labelledby={`${idPrefix}-carrier-l`}>
        <span id={`${idPrefix}-carrier-l`} className="field-label">희망 통신사<span className="req">*</span></span>
        <div className="chips">
          {CARRIERS.map((c) => (
            <label key={c} className={`chip ${value.carrier === c ? "on" : ""}`}>
              <input type="radio" name={`${idPrefix}-carrier`} checked={value.carrier === c} onChange={() => set("carrier", c)} />
              {c}
            </label>
          ))}
        </div>
        {errors.carrier && <span className="err">{errors.carrier}</span>}
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-time`}>통화 가능 시간 <span className="hint">(선택)</span></label>
        <select id={`${idPrefix}-time`} className="select" value={value.callTime} onChange={(e) => set("callTime", e.target.value)}>
          <option value="">선택 안 함</option>
          {CALL_TIMES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-msg`}>문의 내용 <span className="hint">(선택)</span></label>
        <textarea id={`${idPrefix}-msg`} className="textarea" value={value.message} maxLength={1000}
          onChange={(e) => set("message", e.target.value)} placeholder="현재 사용 중인 통신사, 약정 만료 시기 등을 남겨주시면 더 정확히 안내해 드려요." />
      </div>
    </>
  );
}
