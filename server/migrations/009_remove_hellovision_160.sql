-- LG헬로비전 160메가(인터넷 단독) 행 삭제. 007에서 넣은 그대로(속도 분류 없음 · TV 요금 모두 비어 있음)일 때만 지운다.
CREATE FUNCTION pg_temp.drop_160(d jsonb) RETURNS jsonb LANGUAGE sql AS $$
  SELECT CASE WHEN d IS NULL OR NOT (d ? 'carriers') THEN d ELSE
    jsonb_set(d, '{carriers}', COALESCE((
      SELECT jsonb_agg(
        CASE WHEN c->>'id' = 'hellovision' AND jsonb_typeof(c->'priceTable'->'rows') = 'array' THEN
          jsonb_set(c, '{priceTable,rows}', COALESCE((
            SELECT jsonb_agg(r ORDER BY m)
            FROM jsonb_array_elements(c->'priceTable'->'rows') WITH ORDINALITY y(r, m)
            WHERE NOT (r->>'internet' = '160메가'
                       AND (r->'speed' IS NULL OR r->'speed' = 'null'::jsonb)
                       AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(r->'prices') p WHERE p <> 'null'::jsonb))
          ), '[]'::jsonb))
        ELSE c END
        ORDER BY n)
      FROM jsonb_array_elements(d->'carriers') WITH ORDINALITY x(c, n)), '[]'::jsonb))
  END
$$;
UPDATE site_content SET draft = pg_temp.drop_160(draft), published = pg_temp.drop_160(published) WHERE key = 'plans';
