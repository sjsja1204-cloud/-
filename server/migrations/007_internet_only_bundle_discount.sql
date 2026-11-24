-- 인터넷 단독 요금 · 휴대폰 결합 할인액(예상 요금에 반영) · 예상 요금 옆 안내(priceNote) · LG헬로비전 160메가
-- 관리자가 이미 입력한 값은 덮어쓰지 않는다 (비어 있는 단독 요금, 아직 없는 항목만 채움).

DROP FUNCTION IF EXISTS pg_temp.plan_val;
CREATE OR REPLACE FUNCTION pg_temp.plan_val(cid text, speed text, OUT internet_only int, OUT bundle_discount int) LANGUAGE sql AS $$
  SELECT v.io, v.bd FROM (VALUES
    ('kt','100M',23100,3300), ('kt','500M',34100,5500), ('kt','1G',38500,5500),
    ('lg','100M',22000,5500), ('lg','500M',33000,9900), ('lg','1G',38500,13200),
    ('sk','100M',23100,NULL), ('sk','500M',34100,11000), ('sk','1G',39600,13200),
    ('hellovision','100M',20790,NULL), ('hellovision','500M',31460,NULL), ('hellovision','1G',33000,NULL)
  ) v(cid, speed, io, bd) WHERE v.cid = $1 AND v.speed = $2
$$;

DROP FUNCTION IF EXISTS pg_temp.fix_carrier;
CREATE OR REPLACE FUNCTION pg_temp.fix_carrier(c jsonb) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  cid text := c->>'id';
  rows jsonb := '[]'::jsonb;
  r jsonb;
  m record;
  ntv int := jsonb_array_length(COALESCE(c->'priceTable'->'tvPlans', '[]'::jsonb));
BEGIN
  IF c->'priceTable' IS NULL THEN RETURN c; END IF;
  FOR r IN SELECT x FROM jsonb_array_elements(COALESCE(c->'priceTable'->'rows', '[]'::jsonb)) x LOOP
    SELECT * INTO m FROM pg_temp.plan_val(cid, r->>'speed');
    IF jsonb_typeof(r->'internetOnly') IS DISTINCT FROM 'number' THEN
      r := r || jsonb_build_object('internetOnly', m.internet_only);
    END IF;
    IF NOT r ? 'bundleDiscount' THEN
      r := r || jsonb_build_object('bundleDiscount', m.bundle_discount);
    END IF;
    rows := rows || jsonb_build_array(r);
    -- LG헬로비전: 100메가 다음에 160메가(인터넷 단독) 행 추가
    IF cid = 'hellovision' AND r->>'speed' = '100M'
       AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(c->'priceTable'->'rows') y WHERE y->>'internet' LIKE '160%') THEN
      rows := rows || jsonb_build_array(jsonb_build_object(
        'internet', '160메가', 'speed', NULL, 'internetOnly', 27610, 'bundleDiscount', NULL,
        'prices', COALESCE((SELECT jsonb_agg(NULL::int) FROM generate_series(1, ntv)), '[]'::jsonb)));
    END IF;
  END LOOP;
  c := jsonb_set(c, '{priceTable,rows}', rows);
  IF NOT c ? 'priceNote' THEN
    c := c || jsonb_build_object('priceNote', CASE WHEN cid = 'hellovision' THEN '결합할인 문의' ELSE '' END);
  END IF;
  -- LG헬로비전 기본 문구가 그대로면 (결합할인표는 꺼져 있으므로) 결합 요금은 상담 안내로 바꿈
  IF cid = 'hellovision' THEN
    IF c->'priceTable'->>'desc' = '휴대폰 결합 없이 가입할 때의 월 요금입니다. 휴대폰 결합 요금은 아래 표를 확인하세요.' THEN
      c := jsonb_set(c, '{priceTable,desc}', to_jsonb('와이파이 포함 월 요금입니다. 휴대폰 결합 요금은 자주 바뀌어 상담 시 안내해 드립니다.'::text));
    END IF;
    IF c->>'intro' = E'속도별 월 요금과 휴대폰 결합 시 요금을 한 번에 정리했어요.\n가입 조건과 사은품은 상담 시 자세히 안내해 드립니다.' THEN
      c := jsonb_set(c, '{intro}', to_jsonb(E'속도별 인터넷·TV 월 요금을 한 번에 정리했어요.\n휴대폰 결합 할인과 가입 조건·사은품은 상담 시 자세히 안내해 드립니다.'::text));
    END IF;
  END IF;
  RETURN c;
END
$$;

DROP FUNCTION IF EXISTS pg_temp.fix_plans;
CREATE OR REPLACE FUNCTION pg_temp.fix_plans(d jsonb) RETURNS jsonb LANGUAGE sql AS $$
  SELECT CASE WHEN d IS NULL OR NOT (d ? 'carriers') THEN d ELSE
    jsonb_set(d, '{carriers}', COALESCE((
      SELECT jsonb_agg(pg_temp.fix_carrier(c) ORDER BY n)
      FROM jsonb_array_elements(d->'carriers') WITH ORDINALITY x(c, n)), '[]'::jsonb))
  END
$$;

UPDATE site_content SET draft = pg_temp.fix_plans(draft), published = pg_temp.fix_plans(published) WHERE key = 'plans';

-- 간편 견적 '휴대폰 결합' 안내: 이제 인터넷 결합 할인은 예상 요금에 반영됨 (기본 문구 그대로일 때만 교체)
UPDATE site_content SET
  draft = CASE WHEN draft->>'mobileNote' = '결합 할인은 휴대폰 요금제·회선 수에 따라 추가로 적용됩니다.'
               THEN jsonb_set(draft, '{mobileNote}', to_jsonb('인터넷 결합 할인을 반영한 금액이에요. 휴대폰 요금 할인은 요금제·회선 수에 따라 추가로 적용됩니다.'::text)) ELSE draft END,
  published = CASE WHEN published->>'mobileNote' = '결합 할인은 휴대폰 요금제·회선 수에 따라 추가로 적용됩니다.'
               THEN jsonb_set(published, '{mobileNote}', to_jsonb('인터넷 결합 할인을 반영한 금액이에요. 휴대폰 요금 할인은 요금제·회선 수에 따라 추가로 적용됩니다.'::text)) ELSE published END
WHERE key = 'quote';
