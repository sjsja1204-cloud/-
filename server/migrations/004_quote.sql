-- 추가 지시서 2: 접수 유형 + 간편 견적 조건, 통신사 고유색 제거

-- 접수 유형: form(상담 폼) / subsidy(지원금 안내) / consult(맞춤 상담) / recommend(상품 찾기) / quote(간편 견적)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS inquiry_type VARCHAR(20) NOT NULL DEFAULT 'form';
-- 견적 조건은 접수 당시 글자 그대로 저장 (요금표가 바뀌어도 기존 DB 값은 유지)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS quote_carrier VARCHAR(50);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS quote_service VARCHAR(30);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS quote_speed VARCHAR(10);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS quote_mobile_bundle BOOLEAN;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS quote_estimated_price INTEGER;
CREATE INDEX IF NOT EXISTS leads_inquiry_type_idx ON leads (inquiry_type);

-- 요금표: 통신사 color 삭제, 인터넷 상품에 speed(이름에서 추출)·internetOnly 추가
DROP FUNCTION IF EXISTS pg_temp.fix_plans;
CREATE OR REPLACE FUNCTION pg_temp.fix_plans(d jsonb) RETURNS jsonb LANGUAGE sql AS $$
  SELECT CASE WHEN d IS NULL OR NOT (d ? 'carriers') THEN d ELSE
    jsonb_set(d, '{carriers}', COALESCE((
      SELECT jsonb_agg(
        jsonb_set((c - 'color') || jsonb_build_object('logo', COALESCE(c->>'logo', '')), '{priceTable,rows}', COALESCE((
          SELECT jsonb_agg(
            r || jsonb_build_object(
              'speed', COALESCE(r->'speed', to_jsonb(substring(r->>'internet' from '(100M|200M|500M|1G)'))),
              'internetOnly', COALESCE(r->'internetOnly', 'null'::jsonb))
            ORDER BY rn)
          FROM jsonb_array_elements(c->'priceTable'->'rows') WITH ORDINALITY x(r, rn)), '[]'::jsonb))
        ORDER BY cn)
      FROM jsonb_array_elements(d->'carriers') WITH ORDINALITY y(c, cn)), '[]'::jsonb))
  END
$$;
UPDATE site_content SET draft = pg_temp.fix_plans(draft), published = pg_temp.fix_plans(published) WHERE key = 'plans';

-- 배너 테마: orange → teal, mint → sand
UPDATE site_content
   SET draft = replace(replace(draft::text, '"theme": "orange"', '"theme": "teal"'), '"theme": "mint"', '"theme": "sand"')::jsonb,
       published = replace(replace(published::text, '"theme": "orange"', '"theme": "teal"'), '"theme": "mint"', '"theme": "sand"')::jsonb
 WHERE key = 'hero';
